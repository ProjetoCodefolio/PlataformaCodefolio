import { ref, get, update } from "firebase/database";
import { database } from "../config/firebase";

/**
 * Busca todos os usuários do sistema
 * @returns {Promise<Array>} Lista de usuários formatada
 */
export const fetchAllUsers = async () => {
  try {
    const usersRef = ref(database, "users");
    const snapshot = await get(usersRef);
    
    if (!snapshot.exists()) {
      return [];
    }
    
    const usersData = snapshot.val();
    const usersArray = Object.entries(usersData)
      .map(([userId, userData]) => ({
        id: userId,
        displayName: userData.displayName || 
                    `${userData.firstName || ""} ${userData.lastName || ""}`.trim() || 
                    "Usuário " + userId.substring(0, 6),
        email: userData.email || "",
        photoURL: userData.photoURL || "",
        role: userData.role || "user",
        searchText: [
          userData.displayName, 
          userData.firstName, 
          userData.lastName, 
          userData.email
        ].filter(Boolean).join(" ").toLowerCase()
      }));
    
    // Remover duplicatas usando email como chave única
    const uniqueUsers = [];
    const emailMap = new Map();
    
    for (const user of usersArray) {
      // Se o email ainda não foi processado, adicione o usuário
      if (user.email && !emailMap.has(user.email)) {
        emailMap.set(user.email, true);
        uniqueUsers.push(user);
      }
    }
    
    // Ordena os usuários por nome
    return [...uniqueUsers].sort((a, b) => {
      const nameA = (a.displayName || "").toLowerCase();
      const nameB = (b.displayName || "").toLowerCase();
      return nameA.localeCompare(nameB);
    });
  } catch (error) {
    console.error("Erro ao buscar usuários:", error);
    throw error;
  }
};

/**
 * Busca as informações de um usuário pelo ID
 * @param {string} userId - ID do usuário
 * @returns {Promise<Object|null>} Informações do usuário ou null se não encontrado
 */
export const fetchUserById = async (userId) => {
    try {
        const userRef = ref(database, `users/${userId}`);
        const snapshot = await get(userRef);

        if (!snapshot.exists()) {
            return null;
        }

        const userData = snapshot.val();
        return {
            id: userId,
            displayName: userData.displayName || 
                                    `${userData.firstName || ""} ${userData.lastName || ""}`.trim() || 
                                    "Usuário " + userId.substring(0, 6),
            email: userData.email || "",
            photoURL: userData.photoURL || "",
            role: userData.role || "user",
        };
    } catch (error) {
        console.error(`Erro ao buscar usuário com ID ${userId}:`, error);
        throw error;
    }
};