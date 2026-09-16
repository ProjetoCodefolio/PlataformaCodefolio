import { useState } from "react";
import { toast } from "react-toastify";
import { saveQuizResults } from "$api/services/courses/quizSubmission";
import { computeQuizAttemptResult } from "$api/services/courses/quizGrading";

/**
 * Calcula a nota da tentativa (via `computeQuizAttemptResult`, a única fonte
 * de verdade do cálculo) e grava o resultado em `saveQuizResults`.
 *
 * `submitting` cobre só o tempo da submissão em si — a tela de "carregando"
 * some quando ela terminar, passe ou falhe.
 */
export function useQuizSubmission({
  quizId,
  courseId,
  currentVideoId,
  quizSource,
  quizMinPercentage,
  userId,
  onAttemptRegistered,
  onComplete,
  onSubmit,
}) {
  const [submitting, setSubmitting] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [result, setResult] = useState(null);

  const submitAnswers = async (
    questions,
    multipleChoiceAnswers = {},
    openEndedAnswers = {}
  ) => {
    try {
      setSubmitting(true);

      if (!userId) {
        console.error("Erro: Nenhum ID de usuário disponível");
        toast.error("Não foi possível salvar seus resultados. Por favor, faça login.");
        return;
      }

      const quizResultId = quizId?.includes("/") ? quizId.split("/")[1] : quizId;
      const isSlideQuiz = quizSource === "slide" || quizResultId?.startsWith("slide_");

      const computed = computeQuizAttemptResult(
        questions,
        multipleChoiceAnswers,
        openEndedAnswers,
        quizMinPercentage
      );

      setResult(computed);
      setQuizCompleted(true);

      // Salvar resultados (apenas das questões de múltipla escolha).
      // Inclui as perguntas de opinião de propósito: elas não entram na nota
      // (`totalPoints` já as ignora), mas a escolha do aluno precisa ficar
      // gravada em `detailedAnswers` para alimentar a distribuição de respostas.
      const saveResult = await saveQuizResults(
        userId,
        courseId,
        currentVideoId,
        {
          isPassed: computed.isPassed,
          scorePercentage: computed.scorePercentage,
          earnedPoints: computed.earnedPoints,
          totalPoints: computed.totalPoints,
          minPercentage: quizMinPercentage,
        },
        computed.filteredMultipleChoiceAnswers,
        computed.multipleChoiceQuestions,
        computed.answersDetails,
        quizResultId,
        isSlideQuiz
      );

      if (!saveResult.success) {
        toast.error(`Falha ao salvar resultados: ${saveResult.error}`);
        return;
      }

      // Cada submissão conta como uma tentativa (independe de passar ou não),
      // acompanhando o incremento feito no banco por saveQuizResults.
      onAttemptRegistered?.();

      if (computed.isPassed && onComplete) {
        await onComplete(true);
      }

      if (onSubmit) {
        await onSubmit(computed.filteredMultipleChoiceAnswers, computed.isPassed);
      }
    } catch (error) {
      console.error("❌ ERRO AO SALVAR QUIZ:", error);
      toast.error("Erro ao processar respostas. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetSubmission = () => {
    setQuizCompleted(false);
    setResult(null);
  };

  return { submitting, quizCompleted, result, submitAnswers, resetSubmission };
}
