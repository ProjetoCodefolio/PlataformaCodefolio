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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const userRef = ref(database, `users/${user.uid}`);
          const snapshot = await get(userRef);
          if (snapshot.exists()) {
            const data = snapshot.val();

            setUserDetails({
              userId: user.uid,
              firstName: data.firstName,
              lastName: data.lastName,
              photoURL: data.photoURL,
              role: data.role || "user",
            });
          }
        } catch (error) {
          console.error("Erro ao buscar os detalhes do usuário:", error);
        }
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
    updateUserProfile // 
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
