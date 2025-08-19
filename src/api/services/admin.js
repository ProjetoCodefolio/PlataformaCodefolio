import { ref, get, update } from "firebase/database";
import { database } from "../config/firebase";

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