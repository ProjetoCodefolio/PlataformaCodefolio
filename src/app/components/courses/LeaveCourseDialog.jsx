import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { toast } from "react-toastify";
import EnrollmentEndDialog from "./EnrollmentEndDialog";
import {
  leaveConfirmationLines,
  leaveCourse,
  loadEnrollmentContext,
} from "$api/services/courses/enrollment";

/**
 * Saída do curso pelo próprio integrante: lê o caso (papel, grupos em aberto,
 * PIN) para mostrar só as consequências que valem, e encerra a matrícula ao
 * confirmar.
 */
const LeaveCourseDialog = ({ course, userDetails, onClose, onLeft }) => {
  const open = Boolean(course);
  // O último curso mostrado continua no título durante a animação de saída,
  // quando `course` já voltou a null.
  const [shown, setShown] = useState(course);
  const [lines, setLines] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (course) setShown(course);
  }, [course]);

  useEffect(() => {
    if (!course || !userDetails?.userId) return;
    let cancelled = false;
    setLines(null);
    setError("");
    loadEnrollmentContext(course.courseId, userDetails.userId)
      .then((contexto) => {
        if (cancelled) return;
        setLines(
          leaveConfirmationLines({
            course: contexto.course,
            isCourseTeacher: contexto.isCourseTeacher,
            groupsLeft: contexto.groupsLeft,
            assignmentTitles: contexto.assignmentTitles,
          })
        );
      })
      .catch((erro) => {
        console.error("Erro ao preparar a saída do curso:", erro);
        if (!cancelled) setError("Não foi possível carregar os dados do curso.");
      });
    return () => {
      cancelled = true;
    };
  }, [course, userDetails?.userId]);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await leaveCourse({ userDetails, courseId: course.courseId });
      toast.success(course.title ? `Você saiu de ${course.title}.` : "Você saiu do curso.");
      onLeft?.(course);
    } catch (erro) {
      console.error("Erro ao sair do curso:", erro);
      toast.error(erro.message || "Não foi possível sair do curso.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <EnrollmentEndDialog
      open={open}
      title={shown?.title ? `Sair de ${shown.title}?` : "Sair do curso?"}
      lines={lines}
      loading={open && !lines && !error}
      busy={busy}
      error={error}
      confirmLabel="Sair do curso"
      onConfirm={handleConfirm}
      onClose={onClose}
    />
  );
};

LeaveCourseDialog.propTypes = {
  course: PropTypes.shape({
    courseId: PropTypes.string.isRequired,
    title: PropTypes.string,
  }),
  userDetails: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onLeft: PropTypes.func,
};

export default LeaveCourseDialog;
