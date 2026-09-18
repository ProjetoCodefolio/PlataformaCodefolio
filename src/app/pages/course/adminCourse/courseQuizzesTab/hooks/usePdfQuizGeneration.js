import { useState } from "react";
import { toast } from "react-toastify";
import { processPdfAndGenerateQuestions } from "$api/services/courses/quizGenerator/orchestrator";
import { formatFriendlyError } from "$api/services/courses/quizGenerator/errors";

/**
 * Núcleo da geração: extrai o texto do PDF e gera as questões (Question API
 * como provedor primário, GROQ como fallback), reportando progresso/etapa.
 */
export function usePdfQuizGeneration({ pdfFile, numQuestions, questionType, resolveApiKey, selectedModel, getPromptToUse }) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processingStep, setProcessingStep] = useState("");
  const [error, setError] = useState("");
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  // Provider que gerou as questões: 'question_api' (IA Codefolio/GPT-5.5) ou 'groq'
  const [provider, setProvider] = useState(null);

  const processFile = async () => {
    if (!pdfFile) return;

    setLoading(true);
    setError("");
    setProgress(0);
    setGeneratedQuestions([]);
    setProvider(null);

    try {
      const apiKey = resolveApiKey();

      const result = await processPdfAndGenerateQuestions(
        pdfFile,
        numQuestions,
        selectedModel,
        apiKey,
        getPromptToUse(),
        {
          onProgress: setProgress,
          onProcessingStep: setProcessingStep
        },
        questionType
      );

      setGeneratedQuestions(result.questions);
      setProvider(result.provider);

      // Notificar se OCR foi usado
      if (result.stats && result.stats.usedOcr) {
        toast.warning('⚠️ Texto extraído usando OCR (imagens do PDF)', {
          autoClose: 5000,
        });
      }

      // O provedor pode devolver menos questões do que o pedido. Avisar o
      // número real em vez de anunciar sucesso cheio: o gerador não completa
      // a lista por conta própria.
      const geradas = result.questions.length;
      if (geradas < numQuestions) {
        toast.warning(
          `Foram pedidas ${numQuestions} questões e vieram ${geradas}. Gere novamente para completar.`,
          { autoClose: 6000 }
        );
      } else {
        toast.success(`${geradas} questões geradas com sucesso!`);
      }
    } catch (err) {
      // Usar mensagens de erro mais amigáveis
      const friendlyError = formatFriendlyError(err);
      setError(friendlyError);
      toast.error(friendlyError);
    } finally {
      setLoading(false);
    }
  };

  const resetResults = () => {
    setGeneratedQuestions([]);
    setProvider(null);
  };

  return {
    loading,
    progress,
    processingStep,
    error,
    generatedQuestions,
    setGeneratedQuestions,
    provider,
    processFile,
    resetResults,
  };
}
