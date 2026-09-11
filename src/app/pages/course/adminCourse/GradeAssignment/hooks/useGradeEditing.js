import { useState } from "react";
import { toast } from "react-toastify";
import * as assessmentService from "$api/services/courses/assessments";
import { MAXIMUM_GRADE } from "$api/constants/gradeConstants";

/**
 * Edição inline da nota de cada aluno para esta avaliação.
 *
 * Diferente do padrão draft/commit usado em `CourseGrades`/`QuizGradesOverview`
 * (kit compartilhado `useDraftGradeField`): aqui um campo deixado em branco no
 * blur é tratado como INVÁLIDO (não como "sem alteração, descarta o
 * rascunho"), e toda gravação é reenviada ao banco mesmo se o valor não
 * mudou — por isso não reaproveita o hook compartilhado, que tem as duas
 * regras opostas.
 */
export function useGradeEditing({ courseId, assessmentId, grades, setGrades, setSaveStatus }) {
  const [draftGrades, setDraftGrades] = useState({});
  const [invalidStatus, setInvalidStatus] = useState({});
  const [saving, setSaving] = useState({});

  // Valor exibido no campo: o rascunho em digitação, se houver; senão a nota
  // já commitada. Usa `??` para preservar corretamente a nota "0".
  const getFieldValue = (studentId) =>
    draftGrades[studentId] ?? grades[studentId] ?? "";

  // Função para atualizar o valor da nota EM DIGITAÇÃO (não commita ainda).
  const handleGradeChange = (studentId, value) => {
    setDraftGrades((prev) => ({
      ...prev,
      [studentId]: value,
    }));

    // Validação instantânea
    const numValue = parseFloat(value);
    if (
      value.trim() !== "" &&
      (isNaN(numValue) || numValue < 0 || numValue > MAXIMUM_GRADE)
    ) {
      setInvalidStatus((prev) => ({
        ...prev,
        [studentId]: true,
      }));
      // Remova o toast daqui para evitar duplicidade!
    } else {
      setInvalidStatus((prev) => {
        const newStatus = { ...prev };
        delete newStatus[studentId];
        return newStatus;
      });
    }
  };

  // Função para salvar a nota quando o usuário clicar fora do campo
  const handleSaveGrade = async (studentId, value) => {
    const numValue = parseFloat(value);

    // Validação silenciosa - apenas marca como inválido
    if (
      value.trim() === "" ||
      isNaN(numValue) ||
      numValue < 0 ||
      numValue > MAXIMUM_GRADE
    ) {
      setInvalidStatus((prev) => ({
        ...prev,
        [studentId]: true,
      }));
      return;
    }

    setInvalidStatus((prev) => {
      const newStatus = { ...prev };
      delete newStatus[studentId];
      return newStatus;
    });

    // Marcar que está salvando
    setSaving((prev) => ({
      ...prev,
      [studentId]: true,
    }));

    try {
      await assessmentService.assignGrade(
        courseId,
        assessmentId,
        studentId,
        numValue
      );

      // Commit da nota para o estado usado pelo filtro/status e limpeza do
      // rascunho. Só agora (após o blur) a linha pode sair da listagem — com o
      // valor correto (ex.: "10"), e não com um valor parcial digitado.
      setGrades((prev) => ({
        ...prev,
        [studentId]: String(numValue),
      }));
      setDraftGrades((prev) => {
        const next = { ...prev };
        delete next[studentId];
        return next;
      });

      // Atualizar status de salvamento
      setSaveStatus((prev) => ({
        ...prev,
        [studentId]: true,
      }));

      // Toast de sucesso silencioso - apenas visual
    } catch (err) {
      toast.error(
        `Erro ao salvar nota: ${err.message}`
      );
    } finally {
      setSaving((prev) => {
        const newSaving = { ...prev };
        delete newSaving[studentId];
        return newSaving;
      });
    }
  };

  return {
    getFieldValue,
    handleGradeChange,
    handleSaveGrade,
    isInvalid: (studentId) => !!invalidStatus[studentId],
    isSaving: (studentId) => !!saving[studentId],
  };
}
