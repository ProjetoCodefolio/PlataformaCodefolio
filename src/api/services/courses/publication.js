/**
 * ==============================
 * PUBLICAÇÃO PROGRAMADA (publishAt)
 * ==============================
 *
 * Vídeo, slide, material e quiz podem ter um `publishAt`: antes dessa data o
 * item NÃO EXISTE para o aluno (não aparece "em breve", não conta no progresso,
 * na presença nem na média). É diferente da janela do quiz (`openDate`), que
 * mostra o quiz como "agendado".
 *
 * Mesmo contrato das datas da janela do quiz: string ISO em UTC; ausente, ""
 * ou null = publicado. A ocultação é de INTERFACE: os nós de conteúdo têm
 * `.read: true`, então quem lê o banco na mão vê o item programado.
 *
 * Toda tela ou agregação do lado do aluno decide pela `isPublished` daqui.
 * Ninguém compara `publishAt` na mão.
 */

import { ref, onValue } from "firebase/database";
import { database } from "../../config/firebase";
import {
  normalizePublishAt,
  isScheduledAt,
  effectiveQuizPublishAt,
} from "../../../shared/publicationDates.js";

// As regras de data vivem num módulo puro, compartilhado com o Worker que
// avisa a turma na hora da publicação.
export { normalizePublishAt, effectiveQuizPublishAt };

// Diferença entre o relógio do servidor do Firebase e o do navegador. Sem ela,
// adiantar o relógio do computador liberaria o vídeo antes da hora.
let serverTimeOffset = 0;
let offsetListenerStarted = false;

const startServerClock = () => {
  if (offsetListenerStarted) return;
  offsetListenerStarted = true;
  try {
    onValue(ref(database, ".info/serverTimeOffset"), (snap) => {
      const offset = Number(snap.val());
      serverTimeOffset = Number.isFinite(offset) ? offset : 0;
    });
  } catch (error) {
    // Sem o offset, cai no relógio local: pior caso, o aluno que mexer no
    // relógio vê o item antes. Não vale derrubar a tela por isso.
    console.warn("Relógio do servidor indisponível:", error);
  }
};

/**
 * Agora, pelo relógio do servidor (quando já conhecido).
 * @returns {Date}
 */
export const serverNow = () => {
  startServerClock();
  return new Date(Date.now() + serverTimeOffset);
};

/**
 * Indica se o `publishAt` ainda está no futuro (item programado).
 */
export const isScheduled = (publishAt, now = serverNow()) => isScheduledAt(publishAt, now);

/**
 * Indica se o item já está publicado (sem data ou data já passou).
 * @param {Object} item - qualquer objeto com `publishAt` opcional
 */
export const isPublished = (item, now = serverNow()) =>
  !isScheduled(item?.publishAt, now);

/**
 * Filtra uma lista deixando só o que já está publicado.
 */
export const filterPublished = (items, now = serverNow()) =>
  (items || []).filter((item) => isPublished(item, now));

/**
 * Valor a GRAVAR no banco: ISO quando a data está no futuro, `null` quando
 * vazia ou já passada. Data no passado significa "publicar agora", e gravar
 * `null` evita deixar um carimbo velho que alguém depois confunde com agenda.
 */
export const publishAtToPersist = (value, now = serverNow()) =>
  isScheduled(value, now) ? normalizePublishAt(value) : null;

/**
 * Formata para exibição em pt-BR (dd/mm/aaaa às hh:mm). "" quando ausente.
 */
export const formatPublishAt = (value) => {
  const iso = normalizePublishAt(value);
  if (!iso) return "";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Datas de publicação em série, para a importação: a primeira leva sai em
 * `start` e cada leva seguinte `intervalDays` dias depois, com `perSlot` itens
 * por leva. A ordem dos ids é a ordem de publicação.
 *
 * Os dias são somados no calendário LOCAL (setDate), para a hora escolhida
 * pelo professor se manter igual toda semana mesmo com mudança de fuso.
 *
 * @param {string[]} ids - itens na ordem em que devem sair
 * @param {Object} options
 * @param {string} options.start - ISO da primeira publicação
 * @param {number} [options.intervalDays=7]
 * @param {number} [options.perSlot=1]
 * @returns {Object<string, string>} id → ISO ({} se `start` for inválido)
 */
export const buildPublicationSchedule = (
  ids,
  { start, intervalDays = 7, perSlot = 1 } = {}
) => {
  const inicio = normalizePublishAt(start);
  if (!inicio) return {};
  const intervalo = Math.max(0, Math.floor(Number(intervalDays) || 0));
  const porLeva = Math.max(1, Math.floor(Number(perSlot) || 1));

  const schedule = {};
  (ids || []).forEach((id, index) => {
    const leva = Math.floor(index / porLeva);
    const date = new Date(inicio);
    date.setDate(date.getDate() + leva * intervalo);
    schedule[id] = date.toISOString();
  });
  return schedule;
};

/** Chave do quiz em `courseQuizzes/{courseId}` a partir do `quizId` do item. */
const quizKeyOf = (quizId) =>
  typeof quizId === "string" && quizId.includes("/")
    ? quizId.split("/").slice(1).join("/")
    : quizId || null;

/**
 * Marca cada item da página do curso com o estado de publicação, sem tirar
 * nada da lista:
 *  - `scheduled`: o próprio conteúdo ainda não foi publicado;
 *  - `quizScheduled`: o conteúdo está no ar, mas o quiz dele ainda não.
 *
 * As marcas são calculadas UMA vez, na carga. Progresso e conclusão decidem
 * por elas (`toStudentView`), sem consultar o relógio de novo.
 *
 * @param {Array} items - itens já montados para a lista (com `quizId`)
 * @param {Object} quizzes - mapa de `courseQuizzes/{courseId}`
 */
export const annotatePublication = (items, quizzes = {}, now = serverNow()) =>
  (items || []).map((item) => {
    if (!item) return item;
    const quiz = item.quizId ? quizzes?.[quizKeyOf(item.quizId)] : null;
    return {
      ...item,
      scheduled: isScheduled(item.publishAt, now),
      quizScheduled: !!quiz && isScheduled(effectiveQuizPublishAt(quiz, item), now),
    };
  });

/**
 * O que o ALUNO enxerga: sem os itens programados e, nos itens cujo quiz ainda
 * não saiu, sem o quiz. Tirar o `quizId` esconde o botão e também tira o quiz
 * da exigência de conclusão (`isContentCompleted`).
 */
export const toStudentView = (items) =>
  (items || [])
    .filter((item) => item && !item.scheduled)
    .map((item) =>
      item.quizScheduled ? { ...item, quizId: null, quizPassed: false } : item
    );

/**
 * O que acontece com o quiz de um conteúdo quando a data de publicação do
 * conteúdo muda. Serve para o professor confirmar, antes de salvar, que o quiz
 * vai junto (ele segue a data do conteúdo quando não tem data própria mais
 * tarde).
 *
 * Datas já passadas contam como "publicado" (""), para não pedir confirmação
 * de uma troca que o aluno não percebe.
 *
 * @param {Object} params
 * @param {Object} params.quiz - quiz do conteúdo (com `publishAt` opcional)
 * @param {string} params.oldContentPublishAt - data gravada hoje no conteúdo
 * @param {string} params.newContentPublishAt - data do formulário
 * @returns {null|{before: string, after: string, canKeep: boolean}}
 *   null quando não há quiz ou quando o quiz continua aparecendo na mesma
 *   hora. `canKeep` indica que dá para manter o quiz na data anterior (só
 *   quando o conteúdo foi ANTECIPADO: o quiz nunca aparece antes do conteúdo).
 */
export const planQuizPublicationChange = (
  { quiz, oldContentPublishAt, newContentPublishAt },
  now = serverNow()
) => {
  if (!quiz) return null;
  const visivel = (iso) => (isScheduled(iso, now) ? normalizePublishAt(iso) : "");

  const before = visivel(effectiveQuizPublishAt(quiz, { publishAt: oldContentPublishAt }));
  const after = visivel(
    effectiveQuizPublishAt(quiz, { publishAt: publishAtToPersist(newContentPublishAt, now) })
  );
  if (before === after) return null;

  const antecipou = after === "" || (before !== "" && after < before);
  return { before, after, canKeep: before !== "" && antecipou };
};
