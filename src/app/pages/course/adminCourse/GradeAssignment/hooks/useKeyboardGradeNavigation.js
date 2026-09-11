import { useEffect } from "react";

/**
 * Navegação por teclado entre os campos de nota (setas move o foco;
 * Enter/Tab salva a nota atual e avança para o próximo). Foca o primeiro
 * campo automaticamente assim que a lista termina de carregar.
 */
export function useKeyboardGradeNavigation({ filteredStudents, loading, inputRefs, onCommit }) {
  // Focar no primeiro input ao carregar
  useEffect(() => {
    if (!loading && filteredStudents.length > 0) {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [loading, filteredStudents.length]);

  const handleKeyDown = (e, index) => {
    const totalStudents = filteredStudents.length;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = Math.min(index + 1, totalStudents - 1);
      inputRefs.current[nextIndex]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = Math.max(index - 1, 0);
      inputRefs.current[prevIndex]?.focus();
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (e.key === 'Enter') {
        e.preventDefault();
      }
      // Salvar nota atual (usa o valor em digitação, se houver)
      const student = filteredStudents[index];
      const studentId = student.userId || student.id;
      onCommit(studentId);

      // Ir para o próximo
      if (index < totalStudents - 1) {
        const nextIndex = index + 1;
        setTimeout(() => {
          inputRefs.current[nextIndex]?.focus();
        }, 50);
      }
    }
  };

  return { handleKeyDown };
}
