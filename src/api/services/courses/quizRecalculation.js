import { hasQuizSubmissionEvidence } from "./progressAudit";
import { gradedQuestions, isGradedQuestion } from "./quizGrading";

/**
 * Recálculo das notas de quiz já gravadas, para depois que o professor corrige
 * uma questão (gabarito errado, alternativa reordenada, questão removida ou
 * acrescentada).
 *
 * A nota de um quiz é congelada em `quizResults/{uid}/{courseId}/{quizId}` no
 * momento da submissão: `correctAnswers`, `scorePercentage` e `isPassed` são
 * escritos uma única vez por `saveQuizResults`. Corrigir o gabarito depois não
 * muda nada para quem já fez — daí este módulo.
 *
 * Lógica PURA: não importa o Firebase (o config chama `getAnalytics`, que exige
 * `window` e derruba o ambiente `node` do vitest). Quem faz o I/O é
 * `recalculateQuizResults`, em `quizzes.js`.
 *
 * A fonte para o recálculo é `detailedAnswers`, gravado por `saveQuizResults`
 * com o que o aluno marcou (índice + texto) E um snapshot das alternativas da
 * época. Esse snapshot é o que permite distinguir "o professor só trocou o
 * gabarito" (recálculo exato) de "o professor mexeu nas alternativas"
 * (recálculo por texto, com sinalização quando resta ambiguidade).
 */

// --- Normalizações -----------------------------------------------------------

/**
 * O RTDB devolve arrays com buraco como objeto ({0: …, 2: …}); os dois formatos
 * circulam em `questions` e `options`.
 * @param {Array|Object} value
 * @returns {Array}
 */
const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return Object.values(value);
  return [];
};

export const normalizeQuestionList = (questions) =>
  toArray(questions).filter((q) => q && typeof q === "object");

export const normalizeOptionList = (options) => toArray(options);

/**
 * Comparação de textos de alternativa: tolera espaço e caixa, mas NÃO acentos —
 * corrigir um acento é uma edição de texto de verdade, que deve cair no
 * caminho sinalizado em vez de casar silenciosamente.
 * @param {*} value
 * @returns {string}
 */
export const normalizeText = (value) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR");

export const isMultipleChoice = (question) =>
  question?.questionType !== "open-ended";

const isSameOptionList = (a, b) => {
  const listA = normalizeOptionList(a);
  const listB = normalizeOptionList(b);
  if (listA.length === 0 || listA.length !== listB.length) return false;
  return listA.every((opt, i) => normalizeText(opt) === normalizeText(listB[i]));
};

// `Number(null)` e `Number("")` são 0 — sem esta guarda, uma resposta ausente
// viraria "o aluno marcou a alternativa A".
const toOptionIndex = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const index = Number(value);
  return Number.isInteger(index) && index >= 0 ? index : null;
};

// --- Reidentificação da alternativa marcada ----------------------------------

/**
 * Descobre qual alternativa ATUAL corresponde ao que o aluno marcou.
 *
 * A ordem das tentativas é o desenho todo:
 * 1. snapshot idêntico → o índice gravado ainda vale (caso do gabarito trocado,
 *    sem nenhuma ambiguidade);
 * 2. texto único → cobre alternativas REORDENADAS, onde o índice congelado
 *    passou a apontar para outra alternativa;
 * 3. texto repetido → desempata pelo índice gravado;
 * 4. nenhum texto casa → mantém o índice gravado, mas marca `ambiguous`: não dá
 *    para distinguir "corrigiram o texto desta alternativa" de "inseriram uma
 *    alternativa antes dela". Manter o índice não pune o aluno, e o professor
 *    recebe a lista dos casos para conferir.
 *
 * @param {Object} savedAnswer - entrada de detailedAnswers
 * @param {Object} question - questão ATUAL
 * @returns {{index: number|null, matchedBy: string, ambiguous: boolean, unanswered: boolean}}
 */
export const resolveUserOption = (savedAnswer, question) => {
  const currentOptions = normalizeOptionList(question?.options);
  const savedIndex = toOptionIndex(savedAnswer?.userAnswer);
  const savedText = savedAnswer?.userAnswerText;
  const hasSavedText =
    typeof savedText === "string" &&
    savedText.trim() !== "" &&
    normalizeText(savedText) !== normalizeText("Não respondida");

  const unanswered = (matchedBy, ambiguous = false) => ({
    index: null,
    matchedBy,
    ambiguous,
    unanswered: true,
  });

  // 1. Alternativas intactas desde a submissão: o índice gravado é confiável.
  if (
    savedIndex !== null &&
    savedIndex < currentOptions.length &&
    isSameOptionList(savedAnswer?.options, currentOptions)
  ) {
    return {
      index: savedIndex,
      matchedBy: "snapshot",
      ambiguous: false,
      unanswered: false,
    };
  }

  if (!hasSavedText && savedIndex === null) return unanswered("none");

  // 2/3. Casamento por texto (imune a reordenação).
  if (hasSavedText) {
    const matches = currentOptions.reduce((acc, option, index) => {
      if (normalizeText(option) === normalizeText(savedText)) acc.push(index);
      return acc;
    }, []);

    if (matches.length === 1) {
      return {
        index: matches[0],
        matchedBy: "text",
        ambiguous: false,
        unanswered: false,
      };
    }

    if (matches.length > 1) {
      const tiebreak = matches.includes(savedIndex);
      return {
        index: tiebreak ? savedIndex : matches[0],
        matchedBy: tiebreak ? "text-tiebreak" : "text-duplicated",
        ambiguous: !tiebreak,
        unanswered: false,
      };
    }
  }

  // 4. Texto não existe mais: sobra a posição original.
  if (savedIndex !== null && savedIndex < currentOptions.length) {
    return {
      index: savedIndex,
      matchedBy: "index",
      ambiguous: true,
      unanswered: false,
    };
  }

  // 5. A alternativa marcada nem existe mais (professor removeu alternativas).
  return unanswered("out-of-range", true);
};

// --- Casamento questão ↔ resposta gravada ------------------------------------

/**
 * Casa cada questão ATUAL com a resposta gravada. Primeiro por id; depois, para
 * as questões que sobraram, por enunciado — porque "apagar e recriar a questão"
 * é um caminho comum de correção e gera id novo (`uuidv4`), o que zeraria a
 * questão para a turma inteira.
 *
 * @param {Object} detailedAnswers - mapa questionId → resposta gravada
 * @param {Array} questions - questões ATUAIS
 * @returns {{byQuestionId: Object, matchedBy: Object, orphanKeys: Array<string>}}
 */
export const matchAnswersToQuestions = (detailedAnswers = {}, questions = []) => {
  const answers = detailedAnswers && typeof detailedAnswers === "object" ? detailedAnswers : {};
  const currentQuestions = normalizeQuestionList(questions);

  const byQuestionId = {};
  const matchedBy = {};
  const consumed = new Set();

  currentQuestions.forEach((question) => {
    if (question.id && answers[question.id]) {
      byQuestionId[question.id] = answers[question.id];
      matchedBy[question.id] = "id";
      consumed.add(question.id);
    }
  });

  const pending = currentQuestions.filter((q) => !consumed.has(q.id));
  if (pending.length > 0) {
    const freeEntries = Object.entries(answers).filter(([key]) => !consumed.has(key));

    pending.forEach((question) => {
      const target = normalizeText(question.question);
      if (!target) return;

      const hit = freeEntries.find(
        ([key, saved]) => !consumed.has(key) && normalizeText(saved?.question) === target
      );
      if (hit) {
        byQuestionId[question.id] = hit[1];
        matchedBy[question.id] = "question-text";
        consumed.add(hit[0]);
      }
    });
  }

  const orphanKeys = Object.keys(answers).filter((key) => !consumed.has(key));

  return { byQuestionId, matchedBy, orphanKeys };
};

// --- Recomposição de uma resposta -------------------------------------------

// Campos que o professor grava ao avaliar uma questão aberta
// (`gradeOpenEndedAnswer`) e que o recálculo não pode perder.
const OPEN_ENDED_GRADING_FIELDS = ["graded", "grade", "feedback", "gradedAt"];

/**
 * Reconstrói a entrada de `detailedAnswers` de uma questão, no mesmo formato que
 * `saveQuizResults` grava, mas com os dados ATUAIS da questão.
 *
 * @param {Object|null} savedAnswer - resposta gravada (null = questão nova)
 * @param {Object} question - questão ATUAL
 * @returns {{entry: Object, status: string, ambiguous: boolean}}
 */
export const recomputeAnswerEntry = (savedAnswer, question) => {
  if (!isMultipleChoice(question)) {
    const entry = {
      question: question.question,
      questionType: "open-ended",
      answer: savedAnswer?.answer ?? savedAnswer?.userAnswer ?? "",
    };
    entry.userAnswer = entry.answer;

    OPEN_ENDED_GRADING_FIELDS.forEach((field) => {
      if (savedAnswer && savedAnswer[field] !== undefined) {
        entry[field] = savedAnswer[field];
      }
    });

    return { entry, status: "open-ended", ambiguous: false };
  }

  const currentOptions = normalizeOptionList(question.options);
  const correctOption = Number(question.correctOption);

  const resolved = savedAnswer
    ? resolveUserOption(savedAnswer, question)
    : { index: null, matchedBy: "missing", ambiguous: false, unanswered: true };

  // Questão nova ou alternativa marcada que sumiu: -1, e não 0. O fluxo do aluno
  // grava `Number(respostas[id] || 0)`, ou seja, o 0 seria exibido como "marcou
  // a alternativa A" — uma resposta que o aluno nunca deu.
  const index = resolved.index;
  const isCorrect = index !== null && Number(index) === correctOption;

  const entry = {
    question: question.question,
    questionType: "multiple-choice",
    userAnswer: index === null ? -1 : Number(index),
    correctOption,
    userAnswerText: index === null ? "Não respondida" : currentOptions[index] ?? "Não respondida",
    correctOptionText: currentOptions[correctOption] ?? "",
    options: currentOptions,
    isCorrect,
  };

  // Questão sem resposta certa (escala Likert e afins): a escolha do aluno fica
  // gravada — é dela que sai a distribuição de respostas —, mas não há gabarito
  // a exibir nem acerto a contar.
  if (!isGradedQuestion(question)) {
    entry.graded = false;
    entry.isCorrect = false;
    delete entry.correctOption;
    delete entry.correctOptionText;
  }

  if (resolved.matchedBy !== "snapshot" && resolved.matchedBy !== "missing") {
    entry.recalcMatchedBy = resolved.matchedBy;
  } else if (savedAnswer?.recalcMatchedBy) {
    // Depois de um recálculo o snapshot volta a bater com as alternativas
    // atuais, e a informação de como aquela resposta foi reconhecida se perderia
    // — junto com a idempotência, porque a entrada mudaria a cada rodada.
    entry.recalcMatchedBy = savedAnswer.recalcMatchedBy;
  }

  if (resolved.ambiguous || savedAnswer?.recalcAmbiguous) entry.recalcAmbiguous = true;

  return {
    entry,
    status: resolved.unanswered ? "unanswered" : resolved.ambiguous ? "ambiguous" : "matched",
    ambiguous: resolved.ambiguous,
  };
};

// --- Recálculo de um resultado ----------------------------------------------

const isSameValue = (a, b) => {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a && b && typeof a === "object") {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return false;
};

/**
 * Recalcula UM resultado de quiz contra as questões ATUAIS.
 *
 * Espelha exatamente a nota do fluxo do aluno
 * (`src/app/components/courses/quiz/index.jsx`): só questões de múltipla escolha
 * contam, questões abertas nunca afetam a nota, e a porcentagem não é
 * arredondada (a UI já formata).
 *
 * Política de aprovação: `isPassed` só é PROMOVIDO, nunca rebaixado. O app
 * decide conclusão e desbloqueio de conteúdo por `quizResults.isPassed`
 * (`buildQuizPassedById`, em progressAudit.js), então rebaixar tiraria acesso e
 * progresso de um aluno por causa de um erro do professor. Quando a nota
 * recalculada fica abaixo do mínimo mas a aprovação é mantida, o resultado
 * recebe `passedKeptByPolicy: true` para a UI poder dizer isso em voz alta.
 *
 * @param {Object} result - nó quizResults/{uid}/{courseId}/{quizKey}
 * @param {Array|Object} questions - questões ATUAIS do quiz
 * @param {number} minPercentage - nota mínima ATUAL do quiz
 * @param {{keepOrphans?: boolean}} [opts]
 * @returns {{changed: boolean, skipped: string|null, updates: Object|null,
 *   before: Object, after: Object, stats: Object}}
 */
export const recomputeQuizResult = (result, questions, minPercentage, opts = {}) => {
  const { keepOrphans = true } = opts;

  const before = {
    correctAnswers: Number(result?.correctAnswers) || 0,
    totalQuestions: Number(result?.totalQuestions) || 0,
    scorePercentage: Number(result?.scorePercentage) || 0,
    isPassed: result?.isPassed === true || result?.passed === true,
  };

  const skip = (reason) => ({
    changed: false,
    skipped: reason,
    updates: null,
    before,
    after: before,
    stats: { matched: 0, ambiguous: 0, unanswered: 0, orphans: 0, openEnded: 0 },
  });

  if (!result || typeof result !== "object") return skip("sem-resultado");

  // Resultado fantasma (abrir e sair do quiz já gravou aprovação, sem submissão):
  // não há nota a recalcular, e escrever aqui só espalharia o registro forjado.
  if (!hasQuizSubmissionEvidence(result)) return skip("sem-submissao");

  // Resultados antigos, anteriores a `detailedAnswers`, têm nota mas nenhuma
  // resposta: recalcular zeraria a nota de quem fez tudo certo.
  const detailedAnswers = result.detailedAnswers;
  if (!detailedAnswers || typeof detailedAnswers !== "object" || Object.keys(detailedAnswers).length === 0) {
    return skip("sem-respostas-detalhadas");
  }

  const currentQuestions = normalizeQuestionList(questions);
  const { byQuestionId, orphanKeys } = matchAnswersToQuestions(detailedAnswers, currentQuestions);

  const nextAnswers = {};
  const stats = { matched: 0, ambiguous: 0, unanswered: 0, orphans: 0, openEnded: 0 };

  currentQuestions.forEach((question) => {
    if (!question.id) return;
    const { entry, status } = recomputeAnswerEntry(byQuestionId[question.id] || null, question);
    nextAnswers[question.id] = entry;

    if (status === "open-ended") stats.openEnded += 1;
    else if (status === "ambiguous") stats.ambiguous += 1;
    else if (status === "unanswered") stats.unanswered += 1;
    else stats.matched += 1;
  });

  // Respostas de questões que não existem mais: ficam gravadas (trilha de
  // auditoria de uma contestação de nota) marcadas como fora do quiz, e não
  // contam na nota — a soma percorre as questões atuais, não este mapa.
  if (keepOrphans) {
    orphanKeys.forEach((key) => {
      nextAnswers[key] = { ...detailedAnswers[key], removedFromQuiz: true };
    });
  }
  stats.orphans = orphanKeys.length;

  const avaliadas = gradedQuestions(currentQuestions);
  const totalQuestions = avaliadas.length;
  const correctAnswers = avaliadas.filter((q) => nextAnswers[q.id]?.isCorrect).length;
  const scorePercentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 100;

  const min = Number(minPercentage) || 0;
  const passedNow = scorePercentage >= min;
  const isPassed = passedNow || before.isPassed;
  const passedKeptByPolicy = isPassed && !passedNow;

  const updates = {
    correctAnswers,
    totalQuestions,
    scorePercentage,
    isPassed,
    passed: isPassed,
    minPercentage: min,
    passedKeptByPolicy,
    detailedAnswers: nextAnswers,
  };

  const after = { correctAnswers, totalQuestions, scorePercentage, isPassed };

  // Comparar campo a campo garante idempotência: recalcular duas vezes seguidas
  // não gera uma segunda escrita no banco.
  const changed = Object.entries(updates).some(([field, value]) => {
    const current = field === "passedKeptByPolicy" ? result[field] === true : result[field];
    return !isSameValue(current, value);
  });

  return { changed, skipped: null, updates, before, after, stats };
};

/**
 * Consolida os recálculos de uma turma no relatório que a tela mostra antes de
 * confirmar e no toast depois de aplicar.
 * @param {Array<{changed:boolean, skipped:string|null, before:Object, after:Object, stats:Object, userId?:string, name?:string}>} perStudent
 * @returns {Object}
 */
export const summarizeRecalculation = (perStudent = []) => {
  const summary = {
    processed: perStudent.length,
    updated: 0,
    unchanged: 0,
    skipped: 0,
    scoreChanged: 0,
    promoted: 0,
    keptPassed: 0,
    ambiguousAnswers: 0,
    orphanAnswers: 0,
    unansweredQuestions: 0,
    studentsWithAmbiguity: [],
  };

  perStudent.forEach((entry) => {
    if (entry.skipped) {
      summary.skipped += 1;
      return;
    }

    if (entry.changed) summary.updated += 1;
    else summary.unchanged += 1;

    if (entry.before.scorePercentage !== entry.after.scorePercentage) summary.scoreChanged += 1;
    if (!entry.before.isPassed && entry.after.isPassed) summary.promoted += 1;
    if (entry.updates?.passedKeptByPolicy) summary.keptPassed += 1;

    summary.ambiguousAnswers += entry.stats?.ambiguous || 0;
    summary.orphanAnswers += entry.stats?.orphans || 0;
    summary.unansweredQuestions += entry.stats?.unanswered || 0;

    if ((entry.stats?.ambiguous || 0) > 0 && entry.name) {
      summary.studentsWithAmbiguity.push(entry.name);
    }
  });

  return summary;
};
