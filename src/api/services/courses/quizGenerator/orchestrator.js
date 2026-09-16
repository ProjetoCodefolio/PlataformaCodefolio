import {
  generateQuestionsWithQuestionApi,
  isQuestionApiEnabled,
  shouldFallbackToGroq,
} from "../questionApiClient";
import { QUESTION_PROVIDERS, QUESTION_TYPES } from "./constants";
import { extractTextFromPdf } from "./pdfExtraction";
import { generateQuestionsWithGroq } from "./groqClient";

/**
 * Orquestra a geração de questões usando a Question Generator API como
 * provider primário e a GROQ como fallback.
 *
 * Regras (ver implementacao_agente_questoes.md):
 * - Tenta a nova API primeiro, quando habilitada/configurada.
 * - Em erro recuperável (timeout, rede, 502/503/504) faz fallback para GROQ.
 * - Em 400/401 (payload/chave) NÃO faz fallback silencioso: relança o erro.
 * - Se a nova API estiver desabilitada, usa GROQ diretamente.
 *
 * @returns {Promise<{questions: Array, provider: string}>}
 */
export const generateQuestionsWithFallback = async (
  pdfText,
  numQuestions,
  selectedModel,
  apiKey,
  customPrompt,
  onProcessingStep,
  questionType = QUESTION_TYPES.MULTIPLE_CHOICE,
  deps = {}
) => {
  const {
    questionApiEnabled = isQuestionApiEnabled,
    callQuestionApi = generateQuestionsWithQuestionApi,
    callGroq = generateQuestionsWithGroq,
  } = deps;

  // Marca se chegamos à GROQ por causa de uma falha do provedor primário.
  let usedFallback = false;

  if (questionApiEnabled()) {
    try {
      const questions = await callQuestionApi(
        pdfText,
        numQuestions,
        customPrompt,
        questionType,
        onProcessingStep
      );
      console.info("[QuestionGen] Provider usado: question_api (GPT-5.5)");
      return { questions, provider: QUESTION_PROVIDERS.QUESTION_API };
    } catch (error) {
      console.warn(
        "[QuestionGen] Question API (GPT-5.5) falhou:",
        `status=${error?.status ?? "?"}`,
        error?.message
      );

      if (!shouldFallbackToGroq(error)) {
        // 400 (payload) e afins: erro de configuração — não mascarar com fallback.
        console.error(
          "[QuestionGen] Erro não recuperável da Question API. Sem fallback.",
          error
        );
        throw error;
      }

      usedFallback = true;
      console.warn(
        "[QuestionGen] Erro recuperável na Question API. Acionando fallback para GROQ..."
      );
      if (onProcessingStep) {
        onProcessingStep("Provedor principal indisponível. Usando GROQ...");
      }
    }
  }

  try {
    const questions = await callGroq(
      pdfText,
      numQuestions,
      selectedModel,
      apiKey,
      customPrompt,
      onProcessingStep,
      questionType
    );
    console.info(
      `[QuestionGen] Provider usado: groq${usedFallback ? " (fallback)" : ""}`
    );
    return { questions, provider: QUESTION_PROVIDERS.GROQ };
  } catch (groqError) {
    // Diz claramente o que falhou: a GROQ (e se era o fallback do GPT).
    console.error(
      `[QuestionGen] GROQ${usedFallback ? " (fallback)" : ""} também falhou:`,
      groqError?.message,
      groqError
    );
    throw groqError;
  }
};

/**
 * Processa um arquivo PDF e gera questões a partir do seu conteúdo
 * @param {File} pdfFile - Arquivo PDF
 * @param {number} numQuestions - Número de questões a gerar
 * @param {string} selectedModel - ID do modelo selecionado
 * @param {string} apiKey - Chave API GROQ
 * @param {string} customPrompt - Prompt personalizado (opcional)
 * @param {Object} callbacks - Callbacks para atualizar UI
 * @param {string} questionType - Tipo de questão ('multiple' ou 'open')
 * @returns {Promise<{text: string, questions: Array}>} - Texto extraído e questões geradas
 */
export const processPdfAndGenerateQuestions = async (
  pdfFile,
  numQuestions,
  selectedModel,
  apiKey,
  customPrompt,
  callbacks = {},
  questionType = QUESTION_TYPES.MULTIPLE_CHOICE
) => {
  const { onProgress, onProcessingStep } = callbacks;

  try {
    if (onProcessingStep) {
      onProcessingStep('Extraindo texto do PDF...');
    }

    // Extrair texto do PDF (agora retorna objeto com text e stats)
    const extractResult = await extractTextFromPdf(pdfFile, onProgress, selectedModel, onProcessingStep);
    const { text, stats } = extractResult;

    // Log das estatísticas de extração
    console.debug('processPdfAndGenerateQuestions - Extração concluída:', stats);

    if (onProcessingStep) {
      let stepMsg = 'Texto extraído. ';
      if (stats.wasTruncated) {
        stepMsg += `(Texto truncado de ${stats.original} para ${stats.finalLength} caracteres) `;
      }
      stepMsg += 'Preparando geração de questões...';
      onProcessingStep(stepMsg);
    }

    if (onProgress) {
      onProgress(50);
    }

    // Gerar questões: Question API (primário) com fallback para GROQ
    const { questions, provider } = await generateQuestionsWithFallback(
      text,
      numQuestions,
      selectedModel,
      apiKey,
      customPrompt,
      onProcessingStep,
      questionType
    );

    if (onProgress) {
      onProgress(100);
    }

    return {
      text,
      questions,
      provider, // 'question_api' ou 'groq' — usado para feedback visual
      stats // Incluir estatísticas no retorno para diagnóstico
    };
  } catch (error) {
    console.error("Erro ao processar PDF:", error);
    // Propaga o erro original (preservando errorType/details) para que a UI
    // formate uma única vez via formatFriendlyError.
    throw error;
  }
};
