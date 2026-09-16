import { useState } from "react";

const parseGrade = (value) => parseFloat(String(value).replace(",", "."));

/**
 * Padrão draft/commit de edição inline de nota: o valor EM DIGITAÇÃO fica
 * separado do valor já commitado (que alimenta ordenação/filtro/status), e só
 * é persistido ao sair do campo (blur). Um valor commitado com o mesmo número
 * não gera nova escrita; campo esvaziado no blur não apaga a nota já
 * lançada — só descarta o rascunho (o caminho para remover uma nota lançada
 * não é este campo).
 *
 * Chaveado por uma string livre (`key`) escolhida pelo chamador — nas telas
 * atuais é `${studentId}_${assessmentId}` ou equivalente.
 *
 * @param {Object} params
 * @param {number} params.maxGrade - nota máxima aceita (mínima é sempre 0)
 * @param {(key: string, numValue: number, context: *) => Promise<void>} params.onCommit -
 *   chamado só quando o valor é válido E diferente do já commitado. `context`
 *   é repassado tal como recebido em `handleBlur`, para o chamador não
 *   precisar reconstruir dados (ex.: o aluno inteiro) a partir da `key`.
 * @param {(key: string, error: Error, context: *) => void} [params.onError]
 */
export function useDraftGradeField({ maxGrade, onCommit, onError }) {
  const [draftGrades, setDraftGrades] = useState({});
  const [savingCells, setSavingCells] = useState({});
  const [invalidCells, setInvalidCells] = useState({});

  const isGradeOutOfRange = (value) => {
    const numValue = parseGrade(value);
    return isNaN(numValue) || numValue < 0 || numValue > maxGrade;
  };

  const clearDraft = (key) => {
    setDraftGrades((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const markCellValid = (key) => {
    setInvalidCells((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const getFieldValue = (key, committedValue) => {
    const draft = draftGrades[key];
    if (draft !== undefined) return draft;
    return committedValue ?? "";
  };

  const handleChange = (key, value) => {
    setDraftGrades((prev) => ({ ...prev, [key]: value }));

    if (value.trim() !== "" && isGradeOutOfRange(value)) {
      setInvalidCells((prev) => ({ ...prev, [key]: true }));
    } else {
      markCellValid(key);
    }
  };

  const handleBlur = async (key, value, committedValue, context) => {
    const raw = String(value).trim();

    if (raw === "") {
      clearDraft(key);
      markCellValid(key);
      return;
    }

    if (isGradeOutOfRange(raw)) {
      setInvalidCells((prev) => ({ ...prev, [key]: true }));
      return;
    }

    const numValue = parseGrade(raw);
    markCellValid(key);

    if (numValue === (committedValue ?? null)) {
      clearDraft(key);
      return;
    }

    setSavingCells((prev) => ({ ...prev, [key]: true }));

    try {
      await onCommit(key, numValue, context);
      clearDraft(key);
    } catch (error) {
      onError?.(key, error, context);
    } finally {
      setSavingCells((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const resetDrafts = () => {
    setDraftGrades({});
    setInvalidCells({});
  };

  return {
    getFieldValue,
    isInvalid: (key) => Boolean(invalidCells[key]),
    isSaving: (key) => Boolean(savingCells[key]),
    handleChange,
    handleBlur,
    resetDrafts,
  };
}
