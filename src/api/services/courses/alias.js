import { ref, get } from "firebase/database";
import { database } from "../../config/firebase";

/**
 * Verifica se um alias existe para um curso
 * @param {string} alias - Alias a ser verificado
 * @returns {Promise<{exists: boolean, courseId: string|null}>} - Resultado da verificação
 */
export const checkCourseAliasExists = async (alias) => {
    try {
        const courseAliasesRef = ref(database, "courseAliases");
        const snapshot = await get(courseAliasesRef);
        if (snapshot.exists()) {
            const aliases = snapshot.val();
            for (const [aliasKey, aliasData] of Object.entries(aliases)) {
                if (aliasKey === alias) {
                    return { exists: true, courseId: aliasData.courseId };
                }
            } 
        }
        return { exists: false, courseId: null };
    } catch (error) {
        console.error("Erro ao verificar alias do curso:", error);
        throw error;
    }
};


/**
 * Retorna o ID do curso associado a um alias
 * @param {string} alias - Alias do curso
 * @returns {Promise<{courseId: string|null}>} - ID do curso ou null se não encontrado
 */
export const getCourseIdByAlias = async (alias) => {
    try {

        const result = await checkCourseAliasExists(alias);

        const aliasExists = result.exists;
        const courseId = result.courseId;

        if (aliasExists) {
            return { courseId };
        } else {
            return { courseId: null };
        }
    } catch (error) {
        console.error("Erro ao obter ID do curso por alias:", error);
        throw error;
    }
};

/**
 * Verifica se um alias está disponível para ser usado
 * @param {string} alias - Alias a ser verificado
 * @param {string} currentCourseId - ID do curso atual (opcional, para atualização)
 * @returns {Promise<boolean>} - true se disponível, false se já existe
 */
export const isAliasAvailable = async (alias, currentCourseId = null) => {
  try {
    if (!alias?.trim()) return true;
    
    const aliasRef = ref(database, `courseAliases/${alias}`);
    const snapshot = await get(aliasRef);
    
    // Se não existe, o alias está disponível
    if (!snapshot.exists()) return true;
    
    // Se o alias existe e não é do curso atual, não está disponível
    const aliasData = snapshot.val();
        return Boolean(currentCourseId && aliasData.courseId === currentCourseId);
  } catch (error) {
    console.error("Erro ao verificar disponibilidade do alias:", error);
    return false;
  }
};