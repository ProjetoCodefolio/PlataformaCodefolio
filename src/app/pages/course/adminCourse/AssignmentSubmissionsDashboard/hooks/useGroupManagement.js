import { moveMember, removeMember, fetchGroups } from "$api/services/courses/assignmentGroups";
import { notifyGroupChanges } from "$api/services/notifications";
import { toast } from "react-toastify";

/**
 * Gestão manual (professor) de membros de grupo: mover para outro grupo ou
 * remover. Relê os grupos do banco depois de cada mudança.
 */
export function useGroupManagement({ courseId, assignmentId, assignment, setGroups }) {
  const handleMove = async (userId, groupId) => {
    try {
      await moveMember({
        courseId,
        assignmentId,
        groupId,
        userId,
        maxPerGroup: assignment?.groups?.maxPerGroup || 0,
      });
      toast.success("Aluno movido de grupo.");
      setGroups(await fetchGroups(courseId, assignmentId));
      notifyGroupChanges(userId, courseId, assignment, "moved");
    } catch (err) {
      toast.error(err.message || "Erro ao mover aluno.");
    }
  };

  const handleRemoveFromGroup = async (userId, groupId) => {
    try {
      await removeMember(courseId, assignmentId, groupId, userId);
      setGroups(await fetchGroups(courseId, assignmentId));
      notifyGroupChanges(userId, courseId, assignment, "removed");
    } catch (err) {
      toast.error(err.message || "Erro ao remover do grupo.");
    }
  };

  return { handleMove, handleRemoveFromGroup };
}
