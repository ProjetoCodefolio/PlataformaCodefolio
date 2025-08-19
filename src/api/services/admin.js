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
 * Atualiza a role/permissão de um usuário
 * @param {string} userId - ID do usuário
 * @param {string} newRole - Nova role/permissão
 * @returns {Promise<Object>} Resultado da operação
 */
export const updateUserRole = async (userId, newRole) => {
  try {
    if (!userId || !newRole) {
      return {
        success: false,
        message: "ID de usuário e nova role são obrigatórios"
      };
    }
    
    const userRef = ref(database, `users/${userId}`);
    await update(userRef, { role: newRole });
    
    return {
      success: true,
      message: "Role do usuário atualizada com sucesso"
    };
  } catch (error) {
    console.error("Erro ao atualizar role do usuário:", error);
    return {
      success: false,
      message: "Erro ao atualizar role. Tente novamente."
    };
  }
};

/**
 * Filtra usuários com base em um termo de busca
 * @param {Array} users - Lista de usuários
 * @param {string} searchTerm - Termo de busca
 * @returns {Array} Usuários filtrados
 */
export const filterUsersBySearchTerm = (users, searchTerm) => {
  if (!searchTerm.trim()) return users;
  
  const term = searchTerm.toLowerCase();
  return users.filter(user => {
    const displayName = (user.displayName || "").toLowerCase();
    const email = (user.email || "").toLowerCase();
    return displayName.includes(term) || email.includes(term);
  });
};

/**
 * Ordena usuários com base em um critério
 * @param {Array} users - Lista de usuários
 * @param {string} sortOrder - Critério de ordenação
 * @returns {Array} Usuários ordenados
 */
export const sortUsers = (users, sortOrder) => {
  const sortedUsers = [...users];
  
  switch(sortOrder) {
    case "name-asc":
      return sortedUsers.sort((a, b) => 
        (a.displayName || "").toLowerCase().localeCompare((b.displayName || "").toLowerCase())
      );
    case "name-desc":
      return sortedUsers.sort((a, b) => 
        (b.displayName || "").toLowerCase().localeCompare((a.displayName || "").toLowerCase())
      );
    case "email-asc":
      return sortedUsers.sort((a, b) => 
        (a.email || "").toLowerCase().localeCompare((b.email || "").toLowerCase())
      );
    case "email-desc":
      return sortedUsers.sort((a, b) => 
        (b.email || "").toLowerCase().localeCompare((a.email || "").toLowerCase())
      );
    default:
      return sortedUsers;
  }
};