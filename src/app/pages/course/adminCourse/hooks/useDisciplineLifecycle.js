import { useState } from "react";
import { toast } from "react-toastify";
import { closeDiscipline, reopenDiscipline } from "$api/services/courses/courseType";

/**
 * Encerrar/reabrir uma disciplina. Encerrar é diferente de arquivar: arquivar
 * tira do catálogo, encerrar leva a turma inteira para "Concluídos" — por
 * isso a confirmação (na tela) informa o número de alunos afetados.
 *
 * `closedAt`/`setClosedAt` vêm de useCourseFormFields (mesmo fetch inicial do
 * curso), passados aqui por parâmetro em vez de uma segunda busca.
 */
export function useDisciplineLifecycle({ courseId, userDetails, closedAt, setClosedAt }) {
  const [encerrando, setEncerrando] = useState(false);

  const handleEncerrar = async () => {
    setEncerrando(true);
    try {
      const { closedAt: quando, students } = await closeDiscipline(
        courseId,
        userDetails.userId
      );
      setClosedAt(quando);
      toast.success(
        students === 1
          ? "Disciplina encerrada. 1 aluno foi para Concluídos."
          : `Disciplina encerrada. ${students} alunos foram para Concluídos.`
      );
    } catch (error) {
      console.error("Erro ao encerrar a disciplina:", error);
      toast.error("Não foi possível encerrar a disciplina.");
    } finally {
      setEncerrando(false);
    }
  };

  const handleReabrir = async () => {
    setEncerrando(true);
    try {
      const { students } = await reopenDiscipline(courseId);
      setClosedAt(null);
      toast.success(
        students === 1
          ? "Disciplina reaberta. 1 aluno voltou ao status anterior."
          : `Disciplina reaberta. ${students} alunos voltaram ao status anterior.`
      );
    } catch (error) {
      console.error("Erro ao reabrir a disciplina:", error);
      toast.error("Não foi possível reabrir a disciplina.");
    } finally {
      setEncerrando(false);
    }
  };

  return { closedAt, encerrando, handleEncerrar, handleReabrir };
}
