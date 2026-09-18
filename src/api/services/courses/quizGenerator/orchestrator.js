import {
  generateQuestionsWithQuestionApi,
  isQuestionApiEnabled,
  shouldFallbackToGroq,
} from "../questionApiClient";
import { QUESTION_PROVIDERS, QUESTION_TYPES } from "./constants";
import { extractTextFromPdf } from "./pdfExtraction";
import { generateQuestionsWithGroq } from "./groqClient";
import { ErrorTypes } from "./errors";

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
  cadeiaDeModelos,
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

  // Cadeia de modelos: o selecionado primeiro, e os alternativos na ordem da
  // política. Só um modelo que sumiu do provedor (404) faz a vez passar
  // adiante; qualquer outro erro é do pedido, e repetir com outro modelo só
  // gastaria o tempo do professor.
  //
  // São REGISTROS do catálogo, não ids: cada modelo tem contexto, teto de
  // saída e limite de tokens por minuto próprios, e é com eles que o
  // groqClient monta o orçamento da chamada.
  const cadeia = (cadeiaDeModelos || []).filter((m) => m?.modelId);
  const indisponiveis = [];
  let ultimoErro = null;

  for (const modelo of cadeia) {
    try {
      const questions = await callGroq(
        pdfText,
        numQuestions,
        modelo,
        apiKey,
        customPrompt,
        onProcessingStep,
        questionType
      );
      console.info(
        `[QuestionGen] Provider usado: groq${usedFallback ? " (fallback)" : ""}`,
        `modelo=${modelo.modelId}`
      );
      return {
        questions,
        provider: QUESTION_PROVIDERS.GROQ,
        modeloUsado: modelo.modelId,
        modelosIndisponiveis: indisponiveis,
      };
    } catch (groqError) {
      ultimoErro = groqError;

      if (groqError?.errorType !== ErrorTypes.MODEL_NOT_FOUND) {
        console.error(
          `[QuestionGen] GROQ${usedFallback ? " (fallback)" : ""} falhou com modelo ${modelo.modelId}:`,
          groqError?.message,
          groqError
        );
        throw groqError;
      }

      indisponiveis.push(modelo.modelId);
      const proximo = cadeia[cadeia.indexOf(modelo) + 1];
      console.warn(
        `[QuestionGen] Modelo ${modelo.modelId} indisponível no provedor.`,
        proximo ? `Tentando ${proximo.modelId}...` : "Sem alternativa na cadeia."
      );

      if (proximo && onProcessingStep) {
        onProcessingStep(
          `Modelo ${modelo.modelId} indisponível. Tentando ${proximo.modelId}...`
        );
      }
    }
  }

  // A cadeia inteira caiu por 404: o catálogo está velho. A mensagem precisa
  // dizer o que foi tentado, senão o admin não sabe o que desativar.
  console.error(
    "[QuestionGen] Nenhum modelo da cadeia respondeu:",
    indisponiveis.join(", ")
  );
  if (ultimoErro?.details) {
    ultimoErro.details.modelosTentados = indisponiveis;
  }
  throw ultimoErro;
};

/**
 * Processa um arquivo PDF e gera questões a partir do seu conteúdo
 * @param {File} pdfFile - Arquivo PDF
 * @param {number} numQuestions - Número de questões a gerar
 * @param {object[]} cadeiaDeModelos - Registros do catálogo, o escolhido primeiro
 * @param {string} apiKey - Chave API GROQ
 * @param {string} customPrompt - Prompt personalizado (opcional)
 * @param {Object} callbacks - Callbacks para atualizar UI
 * @param {string} questionType - Tipo de questão ('multiple' ou 'open')
 * @returns {Promise<{text: string, questions: Array}>} - Texto extraído e questões geradas
 */
export const processPdfAndGenerateQuestions = async (
  pdfFile,
  numQuestions,
  cadeiaDeModelos,
  apiKey,
  customPrompt,
  callbacks = {},
  questionType = QUESTION_TYPES.MULTIPLE_CHOICE
) => {
  const { onProgress, onProcessingStep } = callbacks;
  const cadeia = (cadeiaDeModelos || []).filter((m) => m?.modelId);

  try {
    if (onProcessingStep) {
      onProcessingStep('Extraindo texto do PDF...');
    }

    // Extrair texto do PDF (agora retorna objeto com text e stats)
    // O primeiro da cadeia é o que o professor escolheu: é o orçamento dele
    // que dimensiona o corte inicial do texto.
    const extractResult = await extractTextFromPdf(pdfFile, onProgress, cadeia[0], onProcessingStep, numQuestions);
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
    const { questions, provider, modeloUsado, modelosIndisponiveis } =
      await generateQuestionsWithFallback(
        text,
        numQuestions,
        cadeia,
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
      modeloUsado, // modelo que de fato respondeu, que pode não ser o escolhido
      modelosIndisponiveis, // modelos que sumiram do provedor nesta geração
      stats // Incluir estatísticas no retorno para diagnóstico
    };
  } catch (error) {
    console.error("Erro ao processar PDF:", error);
    // Propaga o erro original (preservando errorType/details) para que a UI
    // formate uma única vez via formatFriendlyError.
    throw error;
  }
};
