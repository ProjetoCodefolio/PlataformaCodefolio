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
// rodar o dev server (`vite`), sempre false em `vite build` — diferente de
// VITE_MODE (variável do .env), que fica cravada no bundle e não muda entre
// build de dev e de produção se o .env não for trocado.
const useEmulators = import.meta.env.DEV;

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
