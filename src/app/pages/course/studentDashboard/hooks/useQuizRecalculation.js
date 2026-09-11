import { useState } from "react";
import { toast } from "react-toastify";
import { recalculateQuizResults } from "$api/services/courses/quizSubmission";

/**
 * Recálculo das notas depois que o professor corrige uma questão. Primeiro
 * simula (dryRun) para o professor decidir com os números na frente, e só
 * escreve de fato na confirmação.
 * Estados: 'idle' | 'previewing' (simulando) | 'confirming' | 'applying'.
 */
export function useQuizRecalculation({ courseId, quizId, userId, onRecalculated }) {
  const [recalcState, setRecalcState] = useState("idle");
  const [recalcPreview, setRecalcPreview] = useState(null);

  const handleOpenRecalculate = async () => {
    setRecalcState("previewing");

    const result = await recalculateQuizResults(courseId, quizId, {
      actorUserId: userId,
      dryRun: true,
    });

    if (!result.success) {
      setRecalcState("idle");
      toast.error(result.error || "Não foi possível simular o recálculo.");
      return;
    }

    if (result.report.updated === 0) {
      setRecalcState("idle");
      toast.info("As notas já estão atualizadas, nada a recalcular.");
      return;
    }

    setRecalcPreview(result.report);
    setRecalcState("confirming");
  };

  const handleConfirmRecalculate = async () => {
    setRecalcState("applying");

    const result = await recalculateQuizResults(courseId, quizId, {
      actorUserId: userId,
    });

    if (!result.success) {
      setRecalcState("confirming");
      toast.error(result.error || "Não foi possível recalcular as notas.");
      return;
    }

    const { updated, errors } = result.report;
    toast.success(
      `Notas recalculadas: ${updated} aluno(s) atualizado(s).` +
        (errors.length > 0 ? ` ${errors.length} falharam.` : "")
    );

    setRecalcState("idle");
    setRecalcPreview(null);
    await onRecalculated?.();
  };

  const handleCloseRecalculate = () => {
    if (recalcState === "applying") return;
    setRecalcState("idle");
    setRecalcPreview(null);
  };

  return {
    recalcState,
    recalcPreview,
    handleOpenRecalculate,
    handleConfirmRecalculate,
    handleCloseRecalculate,
  };
}
