import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase, connectDatabaseEmulator } from "firebase/database";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER,
  appId: import.meta.env.VITE_APP_ID,
  measurementId: import.meta.env.VITE_MEASUREMENT_ID,
};

// import.meta.env.DEV é definido automaticamente pelo Vite: true apenas ao
// rodar o dev server (`vite`), sempre false em `vite build`. Sem VITE_MODE,
// dev server sempre caía no emulador — mesmo com o .env configurado para
// produção, sem nenhum jeito de testar o dev server contra o Firebase real
// sem editar código. VITE_MODE=production no .env agora tira o emulador da
// jogada mesmo em dev; qualquer outro valor (ou ausente) mantém o
// comportamento de sempre (emulador em dev, real em build de produção).
const useEmulators =
  import.meta.env.VITE_MODE === "production" ? false : import.meta.env.DEV;

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

// Conectar ao emulador apenas em ambiente local. O Auth fica de fora de
// propósito: login com Google usa o OAuth real (o emulador de Auth troca o
// popup do Google pela UI fake dele, que não é o que se quer aqui).
if (useEmulators) {
  console.log("🔥 Conectando ao Firebase Emulator...");
  connectDatabaseEmulator(database, "localhost", 9000);
}
