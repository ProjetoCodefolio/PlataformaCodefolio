import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, database } from "../service/firebase";
import { ref, get } from "firebase/database";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  // Função para buscar os detalhes do usuário no banco de dados
  const fetchUserDetails = async (user) => {
    if (!user) return null;
    
    try {
      const userRef = ref(database, `users/${user.uid}`);
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        const data = snapshot.val();

        return {
          userId: user.uid,
          firstName: data.firstName,
          lastName: data.lastName,
          photoURL: data.photoURL,
          role: data.role || "user",
        };
      }
    } catch (error) {
      console.error("Erro ao buscar os detalhes do usuário:", error);
    }
    return null;
  };

  // Função para atualizar manualmente os dados do usuário
  const refreshUserDetails = async () => {
    if (!currentUser) return;
    const details = await fetchUserDetails(currentUser);
    if (details) {
      setUserDetails(details);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const details = await fetchUserDetails(user);
        setUserDetails(details);
      } else {
        setUserDetails(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const updateUserProfile = (newData) => {
    setCurrentUser(prevUser => ({
      ...prevUser,
      displayName: newData.displayName,
      photoURL: newData.photoURL
    }));
  };

  const value = {
    currentUser,
    userDetails,
    isAdmin: userDetails?.role === "admin",
    updateUserProfile,
    refreshUserDetails // Adicionando a nova função ao contexto
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
