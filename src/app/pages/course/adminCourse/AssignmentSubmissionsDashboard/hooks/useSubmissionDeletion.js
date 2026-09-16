import { useState } from "react";
import { toast } from "react-toastify";
import { deleteSubmission } from "$api/services/courses/submissions";

/**
 * Remove a entrega de um aluno (individual) ou de um grupo. Se a entrega tinha
 * vídeo de sala invertida, ele deixa de aparecer na lista de conteúdo.
 */
export function useSubmissionDeletion({ courseId, assignmentId, setSubmissionsByKey }) {
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteSubmission = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteSubmission(courseId, assignmentId, deleteTarget.submitterKey);
      setSubmissionsByKey((prev) => {
        const next = { ...prev };
        delete next[deleteTarget.submitterKey];
        return next;
      });
      setDeleteTarget(null);
      toast.success("Entrega excluída.");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Erro ao excluir a entrega.");
    } finally {
      setDeleting(false);
    }
  };

  return { deleteTarget, setDeleteTarget, deleting, handleDeleteSubmission };
}
