import { database } from "$api/config/firebase";
import { ref, get, set, update } from "firebase/database";

/**
 * Serviço de Grupos de um enunciado.
 *
 * Estrutura:
 *   assignmentGroups/{courseId}/{assignmentId}/{groupId}
 *     index (number), theme (string), members: { userId: true }
 *
 * A capacidade (maxPerGroup) e o prazo (changeDeadline) vêm do enunciado
 * (assignment.groups) e são validados aqui/no cliente, pois as regras do
 * Realtime Database não conseguem checar contagem de membros de forma robusta.
 */

const groupsPath = (courseId, assignmentId) =>
  `assignmentGroups/${courseId}/${assignmentId}`;

/**
 * Busca os grupos de um enunciado (ordenados por index).
 */
export const fetchGroups = async (courseId, assignmentId) => {
  if (!courseId || !assignmentId) return [];
  try {
    const snapshot = await get(ref(database, groupsPath(courseId, assignmentId)));
    if (!snapshot.exists()) return [];
    const data = snapshot.val();
    return Object.keys(data)
      .map((groupId) => ({
        groupId,
        index: data[groupId].index ?? 0,
        theme: data[groupId].theme || "",
        members: data[groupId].members || {},
      }))
      .sort((a, b) => a.index - b.index);
  } catch (error) {
    console.error("Erro ao buscar grupos:", error);
    throw new Error("Falha ao carregar grupos");
  }
};

/**
 * Cria/ajusta a quantidade de grupos de um enunciado, preservando os grupos e
 * membros existentes. Cria grupos faltantes (g1..gN) e remove os excedentes.
 * @param {string} courseId
 * @param {string} assignmentId
 * @param {number} maxGroups
 * @param {Object} [themes] - mapa opcional { index: theme }
 */
export const setupGroups = async (courseId, assignmentId, maxGroups, themes = {}) => {
  if (!courseId || !assignmentId) throw new Error("IDs obrigatórios");
  try {
    const existing = await fetchGroups(courseId, assignmentId);
    const updates = {};

    for (let i = 0; i < maxGroups; i += 1) {
      const groupId = `g${i + 1}`;
      const current = existing.find((g) => g.groupId === groupId);
      updates[`${groupsPath(courseId, assignmentId)}/${groupId}/index`] = i;
      updates[`${groupsPath(courseId, assignmentId)}/${groupId}/theme`] =
        themes[i] ?? current?.theme ?? "";
      // members preservados: não sobrescreve se já existir
      if (!current) {
        updates[`${groupsPath(courseId, assignmentId)}/${groupId}/members`] = {};
      }
    }

    // Remove grupos excedentes
    existing.forEach((g) => {
      const idx = Number(g.groupId.replace(/^g/, ""));
      if (Number.isFinite(idx) && idx > maxGroups) {
        updates[`${groupsPath(courseId, assignmentId)}/${g.groupId}`] = null;
      }
    });

    await update(ref(database), updates);
  } catch (error) {
    console.error("Erro ao configurar grupos:", error);
    throw new Error("Falha ao configurar grupos");
  }
};

/**
 * Define o tema de um grupo (professor).
 */
export const setGroupTheme = async (courseId, assignmentId, groupId, theme) => {
  try {
    await set(
      ref(database, `${groupsPath(courseId, assignmentId)}/${groupId}/theme`),
      theme || ""
    );
  } catch (error) {
    console.error("Erro ao definir tema do grupo:", error);
    throw new Error("Falha ao definir tema do grupo");
  }
};

/**
 * Retorna o groupId em que o usuário está, ou null.
 */
export const getUserGroup = async (courseId, assignmentId, userId) => {
  const groups = await fetchGroups(courseId, assignmentId);
  const found = groups.find((g) => g.members && g.members[userId]);
  return found ? found.groupId : null;
};

/**
 * Remove um usuário de qualquer grupo em que esteja neste enunciado.
 * Usado internamente antes de entrar em outro e pelo "sair do grupo".
 */
export const leaveAllGroups = async (courseId, assignmentId, userId) => {
  try {
    const groups = await fetchGroups(courseId, assignmentId);
    const updates = {};
    groups.forEach((g) => {
      if (g.members && g.members[userId]) {
        updates[
          `${groupsPath(courseId, assignmentId)}/${g.groupId}/members/${userId}`
        ] = null;
      }
    });
    if (Object.keys(updates).length) await update(ref(database), updates);
  } catch (error) {
    console.error("Erro ao sair dos grupos:", error);
    throw new Error("Falha ao sair do grupo");
  }
};

/**
 * Entra em um grupo respeitando a capacidade e o prazo.
 * Remove o usuário de outros grupos antes (troca livre entre grupos).
 *
 * A escrita é feita na própria chave `members/{userId}` (o que as regras do
 * Realtime Database permitem ao próprio aluno e ao owner). A capacidade é
 * checada por leitura antes da escrita: em caso raro de corrida dois alunos
 * podem estourar o limite, e o professor ajusta manualmente (moveMember).
 *
 * @param {Object} params
 * @param {number} params.maxPerGroup - 0 = sem limite
 * @param {string} [params.changeDeadline] - prazo de troca (ISO)
 * @throws {Error} se prazo expirou ou grupo lotado
 */
export const joinGroup = async ({
  courseId,
  assignmentId,
  groupId,
  userId,
  maxPerGroup = 0,
  changeDeadline,
}) => {
  if (!courseId || !assignmentId || !groupId || !userId) {
    throw new Error("Dados insuficientes para entrar no grupo");
  }
  if (changeDeadline) {
    const deadline = new Date(changeDeadline);
    if (!Number.isNaN(deadline.getTime()) && Date.now() > deadline.getTime()) {
      throw new Error("O prazo para trocar de grupo já encerrou.");
    }
  }

  // Verifica capacidade lendo os membros atuais do grupo alvo.
  const membersSnap = await get(
    ref(database, `${groupsPath(courseId, assignmentId)}/${groupId}/members`)
  );
  const members = membersSnap.val() || {};
  const alreadyIn = !!members[userId];
  if (
    !alreadyIn &&
    maxPerGroup > 0 &&
    Object.keys(members).length >= maxPerGroup
  ) {
    throw new Error("Este grupo já está cheio. Escolha outro grupo.");
  }

  // Sai de outros grupos primeiro e entra no escolhido.
  await leaveAllGroups(courseId, assignmentId, userId);
  await set(
    ref(
      database,
      `${groupsPath(courseId, assignmentId)}/${groupId}/members/${userId}`
    ),
    true
  );
  return true;
};

/**
 * Move um aluno para um grupo manualmente (professor), ignorando prazo mas
 * respeitando capacidade.
 */
export const moveMember = async ({
  courseId,
  assignmentId,
  groupId,
  userId,
  maxPerGroup = 0,
}) =>
  joinGroup({
    courseId,
    assignmentId,
    groupId,
    userId,
    maxPerGroup,
    changeDeadline: null,
  });

/**
 * Remove um aluno de um grupo específico (professor ou o próprio aluno).
 */
export const removeMember = async (courseId, assignmentId, groupId, userId) => {
  try {
    await set(
      ref(
        database,
        `${groupsPath(courseId, assignmentId)}/${groupId}/members/${userId}`
      ),
      null
    );
  } catch (error) {
    console.error("Erro ao remover membro do grupo:", error);
    throw new Error("Falha ao remover membro do grupo");
  }
};
