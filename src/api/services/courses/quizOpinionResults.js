// Leitura das respostas de um questionário de opinião.
//
// Perguntas sem resposta certa não têm nota, então nenhuma das telas de
// acompanhamento existentes mostrava o que os alunos responderam: os dados
// entravam e não saíam. Aqui eles saem em duas formas — a distribuição por
// questão (quantos marcaram cada ponto da escala) e o CSV com uma linha por
// aluno e questão, para analisar fora da plataforma.
//
// A fonte é `quizResults/{uid}/{courseId}/{quizId}/detailedAnswers`, o mesmo nó
// que guarda as respostas avaliadas — a diferença é que a entrada de uma
// pergunta de opinião vem com `graded: false` e sem gabarito.

import { ref, get } from "firebase/database";
import { database } from "../../config/firebase";
import { isGradedQuestion } from "./quizGrading";

/** Rótulo usado quando o aluno pulou a pergunta. */
export const SEM_RESPOSTA = "Não respondida";

/**
 * Índice escolhido pelo aluno numa entrada de resposta, ou `null`.
 *
 * As respostas gravadas têm duas gerações: `userAnswer` (formato atual, gravado
 * por saveQuizResults e pelo recálculo) e `userOption` (submissões mais
 * antigas). `-1` é o marcador de "não respondida".
 * @param {Object} entry
 * @returns {number|null}
 */
export const selectedOptionIndex = (entry) => {
  if (!entry || typeof entry !== "object") return null;
  const bruto = entry.userAnswer ?? entry.userOption;
  if (bruto === null || bruto === undefined || bruto === "") return null;
  const indice = Number(bruto);
  if (!Number.isInteger(indice) || indice < 0) return null;
  return indice;
};

/**
 * Monta a distribuição de respostas de um quiz a partir das submissões.
 *
 * @param {Array} questions - questões do quiz
 * @param {Array<{userId: string, name: string, email: string, detailedAnswers: Object}>} submissions
 * @returns {Array} - uma entrada por questão de opinião
 */
export const buildOpinionDistribution = (questions, submissions) => {
  const perguntas = (Array.isArray(questions) ? questions : []).filter(
    (q) => q && typeof q === "object" && q.questionType !== "open-ended" && !isGradedQuestion(q)
  );
  const envios = Array.isArray(submissions) ? submissions : [];

  return perguntas.map((question) => {
    const options = Array.isArray(question.options) ? question.options : [];
    const counts = new Array(options.length).fill(0);
    let unanswered = 0;
    let answered = 0;

    envios.forEach((submission) => {
      const entry = submission?.detailedAnswers?.[question.id];
      const indice = selectedOptionIndex(entry);

      // Quem não tem entrada nenhuma para a pergunta (respondeu antes de ela
      // existir, por exemplo) não entra na conta como "pulou": não houve
      // oportunidade de responder.
      if (!entry) return;

      if (indice === null || indice >= options.length) {
        unanswered += 1;
        return;
      }

      counts[indice] += 1;
      answered += 1;
    });

    return {
      questionId: question.id,
      question: question.question || "",
      scale: question.scale || null,
      options,
      counts,
      unanswered,
      totalRespondents: answered + unanswered,
      // Percentual sobre quem de fato escolheu uma alternativa: incluir os que
      // pularam no denominador faria as barras não fecharem em 100%.
      percentages: counts.map((n) => (answered > 0 ? (n / answered) * 100 : 0)),
    };
  });
};

/**
 * Busca as submissões de um quiz e devolve a distribuição das perguntas de
 * opinião, junto das submissões cruas (que o CSV usa).
 * @param {string} courseId
 * @param {string} quizId
 * @returns {Promise<{quizId: string, distribution: Array, submissions: Array}>}
 */
export const fetchOpinionResults = async (courseId, quizId) => {
  if (!courseId || !quizId) {
    return { quizId, distribution: [], submissions: [] };
  }

  const quizSnap = await get(ref(database, `courseQuizzes/${courseId}/${quizId}`));
  if (!quizSnap.exists()) {
    throw new Error("Questionário não encontrado");
  }
  const questions = quizSnap.val()?.questions || [];

  const [matriculasSnap, usuariosSnap] = await Promise.all([
    get(ref(database, "studentCourses")),
    get(ref(database, "users")),
  ]);

  const matriculas = matriculasSnap.val() || {};
  const usuarios = usuariosSnap.val() || {};

  const submissions = [];
  for (const [userId, cursos] of Object.entries(matriculas)) {
    if (!cursos || !cursos[courseId]) continue;

    const resultado = (
      await get(ref(database, `quizResults/${userId}/${courseId}/${quizId}`))
    ).val();
    if (!resultado?.detailedAnswers) continue;

    const dados = usuarios[userId] || {};
    submissions.push({
      userId,
      name:
        `${dados.firstName || ""} ${dados.lastName || ""}`.trim() ||
        dados.displayName ||
        dados.email ||
        `Usuário ${userId.substring(0, 6)}`,
      email: dados.email || "",
      submittedAt: resultado.submittedAt || resultado.lastAttempt || "",
      detailedAnswers: resultado.detailedAnswers,
    });
  }

  submissions.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  return {
    quizId,
    distribution: buildOpinionDistribution(questions, submissions),
    submissions,
  };
};

/**
 * Escapa um campo conforme RFC 4180 — mesma regra do CSV de notas: sem isto, um
 * enunciado com vírgula quebra a contagem de colunas do arquivo.
 */
const escapeCsvField = (value) => {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",;\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

export const OPINION_CSV_HEADER = [
  "Aluno",
  "E-mail",
  "Pergunta",
  "Resposta",
  "Posição na escala",
  "Respondido em",
];

/**
 * Exporta as respostas de opinião em CSV: uma linha por aluno e pergunta.
 *
 * A "posição na escala" sai como 1..N (e não 0..N-1, que é o índice interno)
 * porque quem abre a planilha vai somar e tirar média disso.
 * @param {Array} distribution - saída de buildOpinionDistribution
 * @param {Array} submissions - submissões correspondentes
 * @returns {string}
 */
export const exportOpinionAnswersToCSV = (distribution, submissions) => {
  const perguntas = Array.isArray(distribution) ? distribution : [];
  const envios = Array.isArray(submissions) ? submissions : [];
  if (perguntas.length === 0 || envios.length === 0) return "";

  const linhas = [OPINION_CSV_HEADER.map(escapeCsvField).join(",")];

  envios.forEach((submission) => {
    perguntas.forEach((pergunta) => {
      const entry = submission?.detailedAnswers?.[pergunta.questionId];
      if (!entry) return;

      const indice = selectedOptionIndex(entry);
      const respondeu = indice !== null && indice < pergunta.options.length;

      linhas.push(
        [
          submission.name,
          submission.email,
          pergunta.question,
          respondeu ? pergunta.options[indice] : SEM_RESPOSTA,
          respondeu ? String(indice + 1) : "",
          submission.submittedAt,
        ]
          .map(escapeCsvField)
          .join(",")
      );
    });
  });

  return `${linhas.join("\n")}\n`;
};
