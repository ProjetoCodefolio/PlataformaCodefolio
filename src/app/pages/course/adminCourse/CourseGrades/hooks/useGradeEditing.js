import { useState, useTransition } from "react";
import { toast } from "react-toastify";
import * as gradesService from "$api/services/courses/grades";
import * as assessmentService from "$api/services/courses/assessments";
import { MAXIMUM_GRADE } from "$api/constants/gradeConstants";
import { useDraftGradeField } from "../../grades/hooks/useDraftGradeField";

/**
 * Modo de edição inline de notas da tabela geral de `CourseGrades`. Ao
 * commitar uma nota, recalcula o aluno inteiro a partir das notas já em
 * memória (nota final, cor e status acompanham a edição sem ida ao banco).
 */
export function useGradeEditing({ courseId, assessments, setStudentsGrades }) {
  const [editMode, setEditMode] = useState(false);
  // Trocar de modo remonta a coluna de notas inteira. Marcar a troca como
  // transição deixa o clique responder na hora, com o botão indicando o
  // processamento, em vez de a tela travar até a tabela terminar de montar.
  const [isSwitchingMode, startModeTransition] = useTransition();

  const cellKey = (studentId, assessmentId) => `${studentId}_${assessmentId}`;

  // Recalcula o aluno inteiro a partir das notas já em memória: nota final, cor
  // e status acompanham a edição sem ida ao banco.
  const applyGradeToState = (studentId, assessmentId, grade, assignedAt) => {
    setStudentsGrades((prev) =>
      prev.map((student) => {
        if (student.userId !== studentId) return student;

        const updatedGrades = {
          ...student.grades,
          [assessmentId]: { grade, assignedAt },
        };

        return {
          ...student,
          ...gradesService.computeStudentGradeSummary(updatedGrades, assessments),
        };
      })
    );
  };

  const draft = useDraftGradeField({
    maxGrade: MAXIMUM_GRADE,
    onCommit: async (_key, numValue, { student, assessmentId }) => {
      await assessmentService.assignGrade(courseId, assessmentId, student.userId, numValue);
      applyGradeToState(student.userId, assessmentId, numValue, new Date().toISOString());
    },
    onError: (_key, error) => toast.error(`Erro ao salvar nota: ${error.message}`),
  });

  const getGradeFieldValue = (student, assessmentId) =>
    draft.getFieldValue(cellKey(student.userId, assessmentId), student.grades[assessmentId]?.grade ?? null);

  const handleGradeChange = (studentId, assessmentId, value) =>
    draft.handleChange(cellKey(studentId, assessmentId), value);

  const handleGradeBlur = (student, assessmentId, value) =>
    draft.handleBlur(
      cellKey(student.userId, assessmentId),
      value,
      student.grades[assessmentId]?.grade ?? null,
      { student, assessmentId }
    );

  const isCellInvalid = (studentId, assessmentId) => draft.isInvalid(cellKey(studentId, assessmentId));
  const isCellSaving = (studentId, assessmentId) => draft.isSaving(cellKey(studentId, assessmentId));

  const handleToggleEditMode = () => {
    // Rascunhos não commitados não sobrevivem à troca de modo
    draft.resetDrafts();
    startModeTransition(() => setEditMode((prev) => !prev));
  };

  return {
    editMode,
    isSwitchingMode,
    handleToggleEditMode,
    getGradeFieldValue,
    handleGradeChange,
    handleGradeBlur,
    isCellInvalid,
    isCellSaving,
  };
}
