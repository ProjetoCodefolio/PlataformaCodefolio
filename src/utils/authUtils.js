import { signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { auth, database } from "../service/firebase";
import { ref, get, query, orderByChild, equalTo, set } from "firebase/database";

const checkIfEmailExists = async (email) => {
  const usersRef = ref(database, "users");
  const emailQuery = query(usersRef, orderByChild("email"), equalTo(email));
  const snapshot = await get(emailQuery);
  return snapshot.exists();
};

const saveUserToDatabase = async (user) => {
  const userRef = ref(database, `users/${user.uid}`);
  await set(userRef, {
    firstName: user.displayName?.split(" ")[0] || "",
    lastName: user.displayName?.split(" ").slice(1).join(" ") || "",
    email: user.email,
    photoURL: user.photoURL || "",
    gitURL: "",
    linkedinURL: "",
    instagramURL: "",
    facebookURL: "",
    youtubeURL: "",
  });
};

export const handleGoogleSignIn = async (navigate, onSuccess, onError) => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    const emailExists = await checkIfEmailExists(user.email);
    
    if (!emailExists) {
      await saveUserToDatabase(user);
    }
    
    if (onSuccess) onSuccess();
    if (navigate) navigate("/dashboard"); // Só navega se o navigate for fornecido
  } catch (error) {
    console.error("Erro no login:", error);
    if (onError) onError(error);
  }
};

export const handleSignOut = async (navigate) => {
  try {
    await signOut(auth);
    navigate("/login");
  } catch (error) {
    console.error("Erro ao fazer logout:", error);
  }
};

export const getFirebaseErrorMessage = (error) => {
  let erroTipo = error.code ? error.code : error;
  switch (erroTipo) {
    case "INVALID_LOGIN_CREDENTIALS":
      return "As credenciais de login são inválidas.";
    case "auth/invalid-email":
      return "O email fornecido é inválido.";
    case "auth/user-disabled":
      return "Este usuário foi desativado.";
    case "auth/user-not-found":
      return "Nenhum usuário encontrado com este email.";
    case "auth/wrong-password":
      return "A senha está incorreta.";
    case "auth/invalid-credential":
      return "Credencial inválida.";
    default:
      return "Ocorreu um erro desconhecido. Tente novamente.";
  }
};