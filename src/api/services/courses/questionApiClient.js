import { QUESTION_TYPES } from "./quizGenerator";

/**
 * Mapeia o tipo de questão interno para o aceito pela Question Generator API.
 * @param {string} internalType - QUESTION_TYPES.MULTIPLE_CHOICE ou .OPEN
 * @returns {string} - 'multiple_choice' ou 'short_answer'
 */
export const mapQuestionTypeToApi = (internalType) =>
  internalType === QUESTION_TYPES.OPEN ? "short_answer" : "multiple_choice";

const DEFAULT_TIMEOUT_MS = 180000;

/**
 * Converte o valor de `correct_answer` retornado pela Question Generator API
 * no índice numérico (`correctOption`) que a plataforma usa internamente.
 * Aceita letra (A/B/C/D), número (0-based ou 1-based) ou o texto da alternativa.
 * @param {*} correctAnswer - Valor de correct_answer da API
 * @param {string[]} options - Alternativas da questão
 * @returns {number} - Índice da alternativa correta (0 se indeterminável)
 */
const resolveCorrectOption = (correctAnswer, options) => {
  if (correctAnswer == null) return 0;
  const raw = String(correctAnswer).trim();

  // Letra única A-Z -> índice
  if (/^[A-Za-z]$/.test(raw)) {
    const idx = raw.toUpperCase().charCodeAt(0) - 65;
    if (idx >= 0 && idx < options.length) return idx;
  }

  // Texto exatamente igual a uma alternativa
  const textMatch = options.findIndex(
    (opt) => String(opt).trim() === raw
  );
  if (textMatch >= 0) return textMatch;

  return 0;
};

/**
 * Status HTTP que justificam tentar a GROQ como fallback.
 * 400 (payload) e 401 (chave) são erros de configuração e NÃO devem cair
 * em fallback silencioso.
 */
const RECOVERABLE_STATUSES = [502, 503, 504];

/**
 * Decide se um erro da nova API deve disparar fallback para a GROQ.
 * @param {*} error - Erro capturado (pode ter `status`, ou ser de rede/timeout)
 * @returns {boolean}
 */
export const shouldFallbackToGroq = (error) => {
  if (!error) return false;

  const status = error.status;
  if (typeof status === "number") {
    return RECOVERABLE_STATUSES.includes(status);
  }

  // Sem status HTTP: erro de rede ou timeout (AbortError) -> recuperável.
  return true;
};

/**
 * Normaliza a resposta da Question Generator API para o formato interno
 * da plataforma, reaproveitando o mesmo contrato esperado pela GROQ.
 * @param {Object} apiResponse - Corpo JSON retornado pela nova API
 * @param {string} questionType - Tipo de questão ('multiple' ou 'open')
 * @returns {Array} - Questões no formato interno
 */
export const normalizeQuestionApiResponse = (
  apiResponse,
  questionType = QUESTION_TYPES.MULTIPLE_CHOICE
) => {
  const questions = apiResponse?.questions || [];

  if (questionType === QUESTION_TYPES.OPEN) {
    return questions.map((q) => ({
      question: q.question,
      expectedAnswer: q.correct_answer || q.explanation || "",
    }));
  }

  return questions.map((q) => {
    const options = Array.isArray(q.options) ? q.options : [];
    return {
      question: q.question,
      options,
      correctOption: resolveCorrectOption(q.correct_answer, options),
    };
  });
};

/**
 * Lê a configuração da Question Generator API das variáveis de ambiente (Vite).
 * @returns {{baseUrl: string, apiKey: string, timeoutMs: number, enabled: boolean}}
 */
export const getQuestionApiConfig = () => {
  const env = import.meta.env || {};
  const enabledRaw = env.VITE_QUESTION_API_ENABLED;
  return {
    baseUrl: env.VITE_QUESTION_API_BASE_URL || "",
    timeoutMs: Number(env.VITE_QUESTION_API_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS,
    // Habilitada por padrão; só desliga se explicitamente "false"
    enabled: enabledRaw !== "false" && enabledRaw !== false,
  };
};

/**
 * Indica se a nova API está habilitada e configurada para ser usada como
 * provider primário. A API é aberta (sem chave), então depende apenas da
 * base URL estar preenchida.
 * @returns {boolean}
 */
export const isQuestionApiEnabled = () => {
  const { enabled, baseUrl } = getQuestionApiConfig();
  return Boolean(enabled && baseUrl);
};

/**
 * Gera questões usando a Question Generator API (provider primário).
 * Não trata fallback: em qualquer falha lança o erro (com `status` quando
 * houver) para o orquestrador decidir via {@link shouldFallbackToGroq}.
 *
 * @param {string} pdfText - Texto extraído do material do usuário
 * @param {number} numQuestions - Quantidade de questões
 * @param {string|null} customPrompt - Instruções extras opcionais
 * @param {string} questionType - QUESTION_TYPES.MULTIPLE_CHOICE ou .OPEN
 * @param {Function} [onProcessingStep] - Callback de status para a UI
 * @param {Object} [config] - Override de configuração (usado em testes)
 * @returns {Promise<Array>} - Questões já normalizadas para o formato interno
 */
export const generateQuestionsWithQuestionApi = async (
  pdfText,
  numQuestions,
  customPrompt,
  questionType = QUESTION_TYPES.MULTIPLE_CHOICE,
  onProcessingStep,
  config = {}
) => {
  const envConfig = (() => {
    try {
      return getQuestionApiConfig();
    } catch {
      return {};
    }
  })();

  const baseUrl = config.baseUrl ?? envConfig.baseUrl;
  const timeoutMs = config.timeoutMs ?? envConfig.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const fetchImpl = config.fetchImpl ?? fetch;

  if (!baseUrl) {
    const error = new Error(
      "Question Generator API não configurada (VITE_QUESTION_API_BASE_URL)."
    );
    error.status = 400;
    throw error;
  }

  if (onProcessingStep) {
    onProcessingStep(`Gerando ${numQuestions} questões com a IA (GPT-5.5)...`);
  }

  const payload = {
    prompt: pdfText,
    question_count: numQuestions,
    question_type: mapQuestionTypeToApi(questionType),
    language: "pt-BR",
  };
  if (customPrompt) {
    payload.extra_instructions = customPrompt;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // API aberta: somente Content-Type, sem Authorization nem X-API-Key.
    const response = await fetchImpl(`${baseUrl}/v1/questions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const error = new Error(
        `Question API respondeu com status ${response.status}`
      );
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return normalizeQuestionApiResponse(data, questionType);
  } finally {
    clearTimeout(timeout);
  }
};
