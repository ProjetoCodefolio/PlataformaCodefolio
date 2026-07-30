import { database } from "$api/config/firebase";
import { ref, get, set } from "firebase/database";

/**
 * Preferências de notificação por usuário e por curso.
 *
 * Estrutura:
 *   notificationPrefs/{userId}/{courseId}
 *     { newAssignment, newQuiz, grade, groupChanges, deadline, inAppEnabled }
 *
 * Por padrão tudo é `true` (o usuário recebe tudo) e pode desativar por tipo.
 */

export const DEFAULT_PREFS = {
  newAssignment: true,
  newQuiz: true,
  grade: true,
  groupChanges: true,
  deadline: true,
  inAppEnabled: true,
};

/**
 * Busca as preferências de um usuário para um curso (com defaults).
 */
export const fetchPrefs = async (userId, courseId) => {
  if (!userId || !courseId) return { ...DEFAULT_PREFS };
  try {
    const snapshot = await get(
      ref(database, `notificationPrefs/${userId}/${courseId}`)
    );
    if (!snapshot.exists()) return { ...DEFAULT_PREFS };
    return { ...DEFAULT_PREFS, ...snapshot.val() };
  } catch (error) {
    console.error("Erro ao buscar preferências de notificação:", error);
    return { ...DEFAULT_PREFS };
  }
};

/**
 * Salva as preferências de um usuário para um curso.
 */
export const savePrefs = async (userId, courseId, prefs) => {
  if (!userId || !courseId) throw new Error("IDs obrigatórios");
  try {
    await set(ref(database, `notificationPrefs/${userId}/${courseId}`), {
      ...DEFAULT_PREFS,
      ...prefs,
    });
  } catch (error) {
    console.error("Erro ao salvar preferências de notificação:", error);
    throw new Error("Falha ao salvar preferências");
  }
};

/**
 * Verifica se um usuário aceita receber um tipo de notificação para o curso.
 * @param {Object} prefs - resultado de fetchPrefs
 * @param {string} type - 'newAssignment' | 'newQuiz' | 'grade' | 'groupChanges' | 'deadline'
 */
export const acceptsInApp = (prefs, type) => {
  if (!prefs) return true;
  if (prefs.inAppEnabled === false) return false;
  return prefs[type] !== false;
};
