import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCBmVDmk1FQgNh8BoLmIRyroMXNhd_zQJ4",
  authDomain: "plataformacodefolio.firebaseapp.com",
  projectId: "plataformacodefolio",
  storageBucket: "plataformacodefolio.appspot.com",
  messagingSenderId: "1021569305580",
  appId: "1:1021569305580:web:47f204deca86bc622b0ec9",
  measurementId: "G-QEZW71EXML",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
export const database = getDatabase(app);
export { auth };
