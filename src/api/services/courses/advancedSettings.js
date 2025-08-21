import { database } from "$api/config/firebase";
import { ref, get, set, update } from "firebase/database";

/**
 * Estrutura padrão de configurações avançadas
 */
const DEFAULT_ADVANCED_SETTINGS = {
  videos: {
    requirePreviousCompletion: true
  },
  quiz: {
    allowRetry: false,
    showResultAfterCompletion: true
  }
};

/**
 * Busca as configurações avançadas de um curso
 * @param {string} courseId - ID do curso
 * @returns {Promise<Object>} - Configurações avançadas
 */
export const fetchAdvancedSettings = async (courseId) => {
  try {
    if (!courseId) throw new Error("ID do curso é obrigatório");
    
    const settingsRef = ref(database, `courseAdvancedSettings/${courseId}`);
    const snapshot = await get(settingsRef);
    
    if (snapshot.exists()) {
      return snapshot.val();
    }
    
    return DEFAULT_ADVANCED_SETTINGS;
  } catch (error) {
    console.error("Erro ao buscar configurações avançadas:", error);
    return DEFAULT_ADVANCED_SETTINGS;
  }
};

/**
 * Salva as configurações avançadas de um curso
 * @param {string} courseId - ID do curso
 * @param {Object} settings - Configurações avançadas
 * @returns {Promise<boolean>} - Verdadeiro se bem-sucedido
 */
export const saveAdvancedSettings = async (courseId, settings) => {
  try {
    if (!courseId) throw new Error("ID do curso é obrigatório");
    
    const settingsRef = ref(database, `courseAdvancedSettings/${courseId}`);
    await set(settingsRef, {
      ...DEFAULT_ADVANCED_SETTINGS,
      ...settings
    });
    
    return true;
  } catch (error) {
    console.error("Erro ao salvar configurações avançadas:", error);
    throw error;
  }
};

/**
 * Atualiza uma configuração específica
 * @param {string} courseId - ID do curso
 * @param {string} path - Caminho da configuração (ex: "videos.requirePreviousCompletion")
 * @param {any} value - Novo valor
 * @returns {Promise<boolean>} - Verdadeiro se bem-sucedido
 */
export const updateAdvancedSetting = async (courseId, path, value) => {
  try {
    if (!courseId) throw new Error("ID do curso é obrigatório");
    if (!path) throw new Error("Caminho da configuração é obrigatório");
    
    const currentSettings = await fetchAdvancedSettings(courseId);
    const pathParts = path.split('.');
    
    // Constrói um objeto aninhado com o novo valor
    let updatedValue = {};
    if (pathParts.length === 1) {
      updatedValue[pathParts[0]] = value;
    } else {
      updatedValue[pathParts[0]] = {
        ...currentSettings[pathParts[0]],
        [pathParts[1]]: value
      };
    }
    
    const settingsRef = ref(database, `courseAdvancedSettings/${courseId}`);
    await update(settingsRef, updatedValue);
    
    return true;
  } catch (error) {
    console.error("Erro ao atualizar configuração:", error);
    throw error;
  }
};