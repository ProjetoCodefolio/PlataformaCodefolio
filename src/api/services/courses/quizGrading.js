// Quais questões de um quiz VALEM NOTA.
//
// Antes, "vale nota" era sinônimo de "não é dissertativa", e cada ponto que
// somava pontos reimplementava esse filtro do seu jeito — com resultados
// diferentes: `validateQuizAnswers` contava as dissertativas no total, enquanto
// o recálculo e a agregação as descartavam.
//
// Com a escala Likert isso deixou de bastar: uma pergunta de opinião tem
// alternativas, mas nenhuma delas é a certa — marcar uma como gabarito é
// exatamente o que induz a resposta. Então cada questão passa a carregar
// `graded`, e este módulo é o único lugar que decide o que entra na nota.
//
// `graded` ausente = true, para que todo o acervo anterior continue valendo nota
// sem migração de dados.

/** Alternativas pré-carregadas da escala Likert de 5 pontos (concordância). */
export const LIKERT_5_OPTIONS = [
  "Discordo Totalmente",
  "Discordo Parcialmente",
  "Neutro",
  "Concordo Parcialmente",
  "Concordo Totalmente",
];

/** Marcador gravado na questão para a interface reconhecer a escala. */
export const LIKERT_5_SCALE = "likert-5";

/**
 * Normaliza a flag "esta questão tem resposta certa".
 * @param {*} value
 * @returns {boolean}
 */
export const normalizeGradedFlag = (value) => value !== false;

/**
 * Indica se a questão usa uma escala de opinião pré-definida.
 * @param {Object} question
 * @returns {boolean}
 */
export const isLikertQuestion = (question) => question?.scale === LIKERT_5_SCALE;

/**
 * Indica se a questão entra no cálculo da nota.
 *
 * Fica de fora a dissertativa (corrigida à mão, em `openEndedAnswers`) e a
 * questão marcada como sem resposta certa.
 * @param {Object} question
 * @returns {boolean}
 */
export const isGradedQuestion = (question) => {
  if (!question || typeof question !== "object") return false;
  if (question.questionType === "open-ended") return false;
  return normalizeGradedFlag(question.graded);
};

/**
 * Filtra as questões que valem nota.
 * @param {Array} questions
 * @returns {Array}
 */
export const gradedQuestions = (questions) =>
  (Array.isArray(questions) ? questions : []).filter(isGradedQuestion);

/**
 * Indica se o quiz inteiro é um questionário de opinião — nenhuma questão
 * valendo nota. Nesse caso não há nota a exibir nem aprovação a exigir: o quiz
 * conta como concluído pelo simples ato de responder, e é assim que ele deixa de
 * travar progresso e presença.
 * @param {Object|Array} quizOrQuestions
 * @returns {boolean}
 */
export const isOpinionQuiz = (quizOrQuestions) => {
  const questions = Array.isArray(quizOrQuestions)
    ? quizOrQuestions
    : quizOrQuestions?.questions;
  const lista = Array.isArray(questions) ? questions : [];
  if (lista.length === 0) return false;
  return gradedQuestions(lista).length === 0;
};

/**
 * Veredito de uma resposta já submetida, para a tela de resultado.
 *
 * Existe para que "o que a tela pinta de verde ou vermelho" tenha um lugar só.
 * Espalhado, faltou um ponto — o selo do cabeçalho da questão continuava
 * dizendo "Incorreto" numa pergunta sem resposta certa, contradizendo o aviso
 * logo abaixo e sugerindo ao aluno que havia uma resposta esperada.
 *
 * Note que a entrada olhada aqui é a RESPOSTA gravada (que carrega `graded`), e
 * não a questão: o resultado antigo precisa continuar legível mesmo depois de o
 * professor mexer no quiz.
 *
 * @param {Object} answer - entrada de `detailedAnswers` ou de `answersDetails`
 * @returns {"open-ended"|"ungraded"|"correct"|"incorrect"}
 */
export const answerVerdict = (answer) => {
  if (!answer || typeof answer !== "object") return "incorrect";
  if (answer.questionType === "open-ended") return "open-ended";
  if (answer.graded === false) return "ungraded";
  return answer.isCorrect ? "correct" : "incorrect";
};

/** Indica se a resposta comporta veredito de certo/errado. */
export const hasVerdict = (answer) => {
  const veredito = answerVerdict(answer);
  return veredito === "correct" || veredito === "incorrect";
};
