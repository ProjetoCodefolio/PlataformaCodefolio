import { useEffect, useState } from "react";
import { toast } from "react-toastify";

/**
 * Aviso (toast) de alunos sem nota lançada.
 *
 * NOTA: preservado tal como estava — o efeito só chama `checkMissingGrades`
 * quando `attemptedSave` já é `true`, mas a função só de fato avisa quando
 * `attemptedSave` é `false`. Com o guard só sendo ativado por dentro da
 * própria função, essas duas condições nunca se encontram: o toast nunca
 * chega a disparar na prática. Não é escopo desta refatoração corrigir isso
 * — só reorganizar sem mudar comportamento (mesmo um comportamento que já
 * não fazia nada visível).
 */
export function useMissingGradesWarning({ students, grades }) {
  const [attemptedSave, setAttemptedSave] = useState(false);
  const [missingGradesWarningShown, setMissingGradesWarningShown] = useState(false);

  const checkMissingGrades = () => {
    if (missingGradesWarningShown) return;

    const studentsWithoutGrades = students.filter((student) => {
      const studentId = student.userId || student.id;
      const grade = grades[studentId];
      return !grade || grade.trim() === "";
    });

    if (studentsWithoutGrades.length > 0 && !attemptedSave) {
      setAttemptedSave(true);
      setMissingGradesWarningShown(true);

      const studentNames = studentsWithoutGrades
        .slice(0, 3)
        .map((s) => s.name)
        .join(", ");

      const additionalCount = studentsWithoutGrades.length - 3;
      const message = studentsWithoutGrades.length <= 3
        ? `Atenção: ${studentNames} ${studentsWithoutGrades.length === 1 ? 'está' : 'estão'} sem nota.`
        : `Atenção: ${studentNames} e mais ${additionalCount} estudante${additionalCount > 1 ? 's' : ''} estão sem nota.`;

      toast.warning(message, {
        autoClose: 5000,
      });
    }
  };

  // Chamar verificação ao tentar salvar
  useEffect(() => {
    if (attemptedSave && !missingGradesWarningShown) {
      checkMissingGrades();
    }
  }, [grades, attemptedSave]);

  return { attemptedSave, setAttemptedSave };
}
