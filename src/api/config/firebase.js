import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase, connectDatabaseEmulator } from "firebase/database";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER,
  appId: import.meta.env.VITE_APP_ID,
  measurementId: import.meta.env.VITE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);
export const db = getFirestore(app);

// Conectar ao emulador apenas em ambiente local
if (import.meta.env.VITE_MODE === "development") {
  console.log("🔥 Conectando ao Firebase Emulator...");
  connectDatabaseEmulator(database, "localhost", 9000);
  connectFirestoreEmulator(db, "localhost", 8080);
}