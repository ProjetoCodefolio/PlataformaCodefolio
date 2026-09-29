import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword } from "firebase/auth";
import { getDatabase, connectDatabaseEmulator } from "firebase/database";
import { getAnalytics } from "firebase/analytics";
import { resolveRuntimeMode, isLocalHostname } from "./runtimeMode";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER,
  appId: import.meta.env.VITE_APP_ID,
  measurementId: import.meta.env.VITE_MEASUREMENT_ID,
};

// Qual modo (local, produção ou e2e) e o que vai para o emulador: ver
// runtimeMode.js.
const runtimeMode = resolveRuntimeMode(import.meta.env);
const useEmulators = runtimeMode.useDatabaseEmulator;

// Um build e2e aponta para emuladores em localhost. Aberto em qualquer outro
// endereço, ele é um build no lugar errado: para aqui, com o motivo na tela,
// em vez de subir um app que não conversa com banco nenhum.
if (runtimeMode.e2e && !isLocalHostname(window.location.hostname)) {
  const motivo =
    "Este é um build de testes E2E (VITE_MODE=e2e) e só funciona em localhost.";
  document.body.textContent = motivo;
  throw new Error(motivo);
}

// Exposto para o que só existe no ambiente local (o cron simulado das
// publicações programadas, em src/app/dev/).
export const USING_EMULATOR = useEmulators;
export const EMULATOR_DATABASE_URL = `http://localhost:9000?ns=${firebaseConfig.projectId}-default-rtdb`;

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);
// Analytics manda eventos reais pro Google — não roda em dev pra não sujar as
// métricas de produção nem depender de rede externa (GA/GTM) só pra abrir o app.
export const analytics = useEmulators ? null : getAnalytics(app);

// Conectar ao emulador apenas em ambiente local. Fora do modo e2e o Auth fica
// de fora de propósito: login com Google usa o OAuth real (o emulador de Auth
// troca o popup do Google pela UI fake dele, que não é o que se quer no dia a
// dia). No e2e essa UI fake é justamente o que o Playwright preenche.
if (useEmulators) {
  console.log("🔥 Conectando ao Firebase Emulator...");
  connectDatabaseEmulator(database, "localhost", 9000);
}
if (runtimeMode.useAuthEmulator) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
}

// Só no build e2e: deixa o Playwright logar sem o popup do Google, com um
// usuário de e-mail e senha criado direto no emulador de Auth. O popup
// continua coberto por um teste próprio; os outros testes usam este atalho
// porque o popup depende de um script externo (apis.google.com). Fora do e2e
// este bloco não existe: o Vite o remove do build.
if (runtimeMode.e2e) {
  window.__codefolioE2E = {
    signIn: async (email, password) => {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      return credential.user.uid;
    },
  };
}
