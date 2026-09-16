import { useState } from "react";
import { toast } from "react-toastify";
import { restoreQuizAttempt } from "$api/services/courses/quizSubmission";

/**
 * Devolve uma tentativa de quiz a um aluno (ação do professor) e recarrega
 * os dados agregados, mantendo o modal de detalhes do aluno aberto com os
 * números atualizados.
 */
export function useRestoreAttempt({ courseId, reload, onRestored }) {
  // Quiz cuja tentativa o professor pediu para devolver (aguardando confirmação).
  const [attemptToRestore, setAttemptToRestore] = useState(null);
  const [restoringAttempt, setRestoringAttempt] = useState(false);

  const handleConfirmRestoreAttempt = async () => {
    if (!attemptToRestore) return;
    const { userId, quizId } = attemptToRestore;

    try {
      setRestoringAttempt(true);
      const result = await restoreQuizAttempt(userId, courseId, quizId);

      if (!result.success) {
        toast.error(result.error || "Não foi possível devolver a tentativa.");
        return;
      }

      toast.success("Tentativa devolvida ao aluno.");
      const refreshed = await reload();
      onRestored(refreshed?.students?.find((s) => s.userId === userId) || null);
    } catch (error) {
      console.error("Erro ao devolver tentativa:", error);
      toast.error("Erro ao devolver a tentativa.");
    } finally {
      setRestoringAttempt(false);
      setAttemptToRestore(null);
    }
  };

  return {
    attemptToRestore,
    setAttemptToRestore,
    restoringAttempt,
    handleConfirmRestoreAttempt,
  };
}
