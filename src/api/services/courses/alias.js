import { ref, get } from "firebase/database";
import { database } from "../../config/firebase";

// Caracteres aceitos num apelido de curso. Vale como validação de entrada do
// professor E como guarda antes de montar o caminho no banco: o alias vem da
// URL (/cursos/:alias) e chaves do Realtime Database não podem conter
// . # $ [ ] / — montar um ref com isso lança exceção.
export const ALIAS_PERMITIDO = /^[a-zA-Z0-9_-]+$/;

/**
 * Verifica se o alias tem um formato utilizável como chave no banco.
 * @param {string} alias
 * @returns {boolean}
 */
export const isAliasFormatValid = (alias) =>
    typeof alias === "string" && ALIAS_PERMITIDO.test(alias);

/**
 * Verifica se um alias existe para um curso
 * @param {string} alias - Alias a ser verificado
 * @returns {Promise<{exists: boolean, courseId: string|null}>} - Resultado da verificação
 */
export const checkCourseAliasExists = async (alias) => {
    try {
        // Alias fora do formato nunca foi gravado — e viraria um caminho
        // inválido. Responde "não existe" sem tocar no banco.
        if (!isAliasFormatValid(alias)) {
            return { exists: false, courseId: null };
        }

        // Leitura direta da chave. Varrer o nó `courseAliases` inteiro só para
        // achar uma chave fazia o custo de abrir um link amigável crescer com o
        // número de cursos da plataforma.
        const snapshot = await get(ref(database, `courseAliases/${alias}`));
        if (!snapshot.exists()) {
            return { exists: false, courseId: null };
        }

        return { exists: true, courseId: snapshot.val()?.courseId ?? null };
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
    if (!isAliasFormatValid(alias)) return false;

    const { exists, courseId } = await checkCourseAliasExists(alias);

    // Se não existe, o alias está disponível
    if (!exists) return true;

    // Se o alias existe e não é do curso atual, não está disponível
    return Boolean(currentCourseId && courseId === currentCourseId);
  } catch (error) {
    console.error("Erro ao verificar disponibilidade do alias:", error);
    return false;
  }
};