import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { toast } from "react-toastify";
import EnrollmentEndDialog from "./EnrollmentEndDialog";
import {
  loadEnrollmentContext,
  removalConfirmationLines,
  removeStudentFromCourse,
} from "$api/services/courses/enrollment";

/**
 * Remoção da turma por quem conduz o curso: lê o caso (grupos em aberto, PIN)
 * para mostrar só as consequências que valem, e encerra a matrícula ao
 * confirmar. Nada é apagado; a readmissão fica na mesma lista.
 */
const RemoveStudentDialog = ({ student, courseId, userDetails, displayName, onClose, onRemoved }) => {
  const open = Boolean(student);
  // O último aluno mostrado continua no título durante a animação de saída.
  const [shown, setShown] = useState(student);
  const [lines, setLines] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (student) setShown(student);
  }, [student]);

  const nome = displayName(shown) || "este aluno";

  useEffect(() => {
    if (!student || !courseId) return;
    let cancelled = false;
    setLines(null);
    setError("");
    loadEnrollmentContext(courseId, student.userId)
      .then((contexto) => {
        if (cancelled) return;
        setLines(
          removalConfirmationLines({
            course: contexto.course,
            studentName: displayName(student),
            groupsLeft: contexto.groupsLeft,
            assignmentTitles: contexto.assignmentTitles,
          })
        );
      })
      .catch((erro) => {
        console.error("Erro ao preparar a remoção:", erro);
        if (!cancelled) setError("Não foi possível carregar os dados do aluno.");
      });
    return () => {
      cancelled = true;
    };
  }, [student, courseId, displayName]);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await removeStudentFromCourse({ userDetails, courseId, studentId: student.userId });
      toast.success(`${displayName(student)} foi removido da turma.`);
      onRemoved?.(student);
    } catch (erro) {
      console.error("Erro ao remover da turma:", erro);
      toast.error(erro.message || "Não foi possível remover da turma.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <EnrollmentEndDialog
      open={open}
      title={`Remover ${nome} da turma?`}
      lines={lines}
      loading={open && !lines && !error}
      busy={busy}
      error={error}
      confirmLabel="Remover da turma"
      onConfirm={handleConfirm}
      onClose={onClose}
    />
  );
};

RemoveStudentDialog.propTypes = {
  student: PropTypes.shape({
    userId: PropTypes.string.isRequired,
    name: PropTypes.string,
  }),
  courseId: PropTypes.string,
  userDetails: PropTypes.object,
  displayName: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onRemoved: PropTypes.func,
};

export default RemoveStudentDialog;
