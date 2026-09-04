// Importação de um questionário pronto de OUTRO curso.
//
// Um quiz é chaveado pelo conteúdo ao qual se prende — `courseQuizzes/{courseId}/{contentId}`
// —, então importar não é só copiar: é preciso escolher a que vídeo/slide DESTE
// curso o questionário passa a pertencer.
//
// As respostas dos alunos NÃO acompanham a cópia, e isso não é um cuidado
// especial: elas moram em nós irmãos (`quizResults`, `customQuizResults`,
// `liveQuizResults`, `openEndedAnswers`), que esta função nem toca. O quiz
// chega necessariamente zerado no destino.

import { ref, get, set } from "firebase/database";
import { v4 as uuidv4 } from "uuid";
import { database } from "../../config/firebase";
import { fetchCourseContentItems } from "./content";
import { fetchFlippedClassroomVideos } from "./submissions";
import {
  fetchCourseQuizzes,
  fetchCourseVideosForQuiz,
  normalizeDiagnosticFlag,
  persistableQuizSettings,
} from "./quizzes";

/**
 * Monta o rótulo legível de cada alvo de quiz de um curso (vídeo, slide ou
 * vídeo de entrega), na mesma composição que a aba de quizzes usa.
 * @param {string} courseId
 * @returns {Promise<Map<string, string>>} - contentId → título
 */
export const fetchQuizTargetTitles = async (courseId) => {
  const [contentData, videosData, flippedData] = await Promise.all([
    fetchCourseContentItems(courseId),
    fetchCourseVideosForQuiz(courseId),
    fetchFlippedClassroomVideos(courseId),
  ]);

  const titulos = new Map();
  // Ordem importa: os vídeos legados entram primeiro para que a collection
  // unificada, mais recente, prevaleça quando os dois trouxerem o mesmo id.
  videosData.forEach((v) => titulos.set(v.id, v.title || "Conteúdo sem título"));
  flippedData.forEach((v) => titulos.set(v.id, `${v.title || "Entrega"} (Entrega)`));
  contentData.forEach((item) =>
    titulos.set(
      item.id,
      item.category === "slide"
        ? `${item.title || "Slide"} (Slide)`
        : item.title || "Conteúdo sem título"
    )
  );

  return titulos;
};

/**
 * Lista os questionários de um curso em forma de opções de importação.
 * @param {string} courseId - curso de ORIGEM
 * @returns {Promise<Array>} - quizzes com rótulo e resumo
 */
export const fetchImportableQuizzes = async (courseId) => {
  if (!courseId) return [];

  const [quizzes, titulos] = await Promise.all([
    fetchCourseQuizzes(courseId),
    fetchQuizTargetTitles(courseId),
  ]);

  return Object.entries(quizzes || {})
    .map(([quizId, quiz]) => ({
      quizId,
      // O conteúdo de origem pode ter sido excluído sem que o quiz fosse junto;
      // sem o fallback a opção apareceria em branco na lista.
      title: titulos.get(quizId) || "Conteúdo removido",
      questionCount: Array.isArray(quiz?.questions) ? quiz.questions.length : 0,
      minPercentage: Number(quiz?.minPercentage) || 0,
      isDiagnostic: normalizeDiagnosticFlag(quiz?.isDiagnostic),
    }))
    .filter((quiz) => quiz.questionCount > 0)
    .sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
};

/**
 * Copia as questões gerando ids novos.
 *
 * Reaproveitar os ids da origem faria as respostas antigas de LÁ casarem com o
 * quiz novo em `matchAnswersToQuestions` durante um recálculo — o aluno do curso
 * novo herdaria a nota de alguém do curso velho.
 * @param {Array} questions
 * @returns {Array}
 */
export const copyQuestionsWithNewIds = (questions) =>
  (Array.isArray(questions) ? questions : [])
    .filter((q) => q && typeof q === "object")
    .map((question) => ({ ...question, id: uuidv4() }));

/**
 * Monta o quiz que será gravado no destino a partir do registro de origem.
 *
 * Separado da gravação porque a importação de CONTEÚDO precisa das mesmas
 * decisões — ids novos nas questões, janela de disponibilidade descartada — mas
 * grava tudo num único update junto com o conteúdo recém-criado.
 *
 * @param {Object} params
 * @param {Object} params.origem - registro do quiz na origem
 * @param {string} params.targetCourseId
 * @param {string} params.targetContentId
 * @param {boolean} [params.copySettings]
 * @returns {Object} quiz pronto para gravar
 * @throws se o quiz de origem não tiver questões
 */
export const buildImportedQuiz = ({
  origem,
  targetCourseId,
  targetContentId,
  copySettings = true,
}) => {
  const questions = copyQuestionsWithNewIds(origem?.questions);
  if (questions.length === 0) {
    throw new Error("O questionário de origem não tem questões");
  }

  return {
    videoId: targetContentId,
    courseId: targetCourseId,
    questions,
    minPercentage: copySettings ? Number(origem.minPercentage) || 0 : 0,
    isDiagnostic: copySettings ? normalizeDiagnosticFlag(origem.isDiagnostic) : false,
    // A janela de disponibilidade nunca vem junto: data de outro semestre
    // chegaria com o quiz já fechado. O destino nasce sempre aberto.
    ...persistableQuizSettings(
      copySettings
        ? { allowRetry: origem.allowRetry, maxAttempts: origem.maxAttempts }
        : {}
    ),
  };
};

/**
 * Importa um questionário de outro curso, prendendo-o a um conteúdo deste.
 *
 * @param {Object} params
 * @param {string} params.sourceCourseId - curso de origem
 * @param {string} params.sourceQuizId - quiz na origem
 * @param {string} params.targetCourseId - curso de destino
 * @param {string} params.targetContentId - vídeo/slide do destino que recebe o quiz
 * @param {boolean} [params.copySettings] - trazer nota mínima, tentativas e diagnóstico
 * @returns {Promise<Object>} - quiz criado no destino
 */
export const importQuizFromCourse = async ({
  sourceCourseId,
  sourceQuizId,
  targetCourseId,
  targetContentId,
  copySettings = true,
}) => {
  if (!sourceCourseId || !sourceQuizId) {
    throw new Error("Selecione o curso e o questionário de origem");
  }
  if (!targetCourseId || !targetContentId) {
    throw new Error("Selecione o conteúdo que vai receber o questionário");
  }
  if (sourceCourseId === targetCourseId && sourceQuizId === targetContentId) {
    throw new Error("O questionário já está neste conteúdo");
  }

  const origemSnap = await get(
    ref(database, `courseQuizzes/${sourceCourseId}/${sourceQuizId}`)
  );
  if (!origemSnap.exists()) {
    throw new Error("O questionário de origem não existe mais");
  }

  const destinoRef = ref(database, `courseQuizzes/${targetCourseId}/${targetContentId}`);
  const destinoSnap = await get(destinoRef);
  if (destinoSnap.exists()) {
    throw new Error("Este conteúdo já tem um questionário. Exclua-o antes de importar.");
  }

  const novoQuiz = buildImportedQuiz({
    origem: origemSnap.val(),
    targetCourseId,
    targetContentId,
    copySettings,
  });

  await set(destinoRef, novoQuiz);
  return novoQuiz;
};
