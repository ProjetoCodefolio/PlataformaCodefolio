import { useState } from "react";
import { toast } from "react-toastify";
import { assignGrade, assignFeedback } from "$api/services/courses/assessments";
import { markSubmissionGraded } from "$api/services/courses/submissions";
import { notifyGrade } from "$api/services/notifications";

/**
 * Lançamento de nota e feedback escrito para um conjunto de alunos (1 para
 * individual, N para grupo — a mesma nota/texto vale para todos de uma vez).
 */
export function useGradeAndFeedbackPersistence({
  courseId,
  assignmentId,
  assignment,
  submissionsByKey,
  setGradesByStudent,
  setFeedbackByStudent,
}) {
  const [savingKey, setSavingKey] = useState(null);
  const [savingFeedbackKey, setSavingFeedbackKey] = useState(null);

  /**
   * Persiste a nota para um conjunto de alunos (1 para individual, N para grupo)
   * gravando em courseAssessments para refletir na média do curso.
   */
  const persistGrade = async (savingKeyId, studentIds, gradeValue, metaKey = null) => {
    if (!assignment?.linkedAssessmentId) {
      toast.warn("Este trabalho não vale nota. Defina um peso (%) no enunciado para poder avaliar.");
      return;
    }
    const grade = Number(gradeValue);
    if (Number.isNaN(grade) || grade < 0 || grade > 10) {
      toast.error("A nota deve estar entre 0 e 10.");
      return;
    }
    setSavingKey(savingKeyId);
    try {
      await Promise.all(
        studentIds.map((sid) =>
          assignGrade(courseId, assignment.linkedAssessmentId, sid, grade)
        )
      );
      // Metadado no envio só faz sentido quando existe uma entrega para a chave
      // (evita criar nós fantasmas ao dar nota individual a um membro de grupo).
      if (metaKey && submissionsByKey[metaKey]) {
        await markSubmissionGraded(courseId, assignmentId, metaKey, grade);
      }
      // Notifica cada aluno avaliado
      studentIds.forEach((sid) =>
        notifyGrade(sid, courseId, { id: assignmentId, title: assignment.title }, grade)
      );
      setGradesByStudent((prev) => {
        const next = { ...prev };
        studentIds.forEach((sid) => {
          next[sid] = grade;
        });
        return next;
      });
      toast.success("Nota salva e refletida em Avaliações.");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao lançar a nota.");
    } finally {
      setSavingKey(null);
    }
  };

  /**
   * Grava o feedback escrito do professor para todos os integrantes de um grupo.
   *
   * O texto é o mesmo para o grupo inteiro e vai num único update, pela mesma
   * razão da nota: metade do grupo com retorno e metade sem seria pior do que
   * nenhum. Não notifica ninguém — o feedback acompanha uma nota que já foi
   * anunciada, e um segundo aviso pelo mesmo trabalho vira ruído.
   */
  const persistFeedback = async (savingKeyId, studentIds, texto) => {
    if (!assignment?.linkedAssessmentId) {
      toast.warn("Este trabalho não vale nota. Defina um peso (%) no enunciado para poder avaliar.");
      return;
    }

    setSavingFeedbackKey(savingKeyId);
    try {
      await assignFeedback(
        courseId,
        assignment.linkedAssessmentId,
        studentIds,
        texto
      );

      const limpo = String(texto ?? "").trim();
      setFeedbackByStudent((prev) => {
        const next = { ...prev };
        studentIds.forEach((sid) => {
          if (limpo) next[sid] = limpo;
          else delete next[sid];
        });
        return next;
      });

      toast.success(
        limpo
          ? studentIds.length === 1
            ? "Feedback salvo."
            : `Feedback salvo para ${studentIds.length} integrantes.`
          : "Feedback removido."
      );
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar o feedback.");
    } finally {
      setSavingFeedbackKey(null);
    }
  };

  return { savingKey, savingFeedbackKey, persistGrade, persistFeedback };
}
