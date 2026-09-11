import { useState } from "react";

/**
 * Edição inline das questões geradas por PDF (antes de mandá-las ao quiz) —
 * não mexe no formulário manual de questão do card expandido.
 */
export function useGeneratedQuestionsEditor({ generatedQuestions, setGeneratedQuestions }) {
  const [editingGeneratedIndex, setEditingGeneratedIndex] = useState(null);

  const toggleInlineEdit = (index) => {
    setEditingGeneratedIndex((prev) => (prev === index ? null : index));
  };

  const updateGeneratedQuestion = (index, patch) => {
    setGeneratedQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, ...patch } : q))
    );
  };

  const updateGeneratedOption = (qIndex, optIndex, value) => {
    setGeneratedQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        const nextOptions = Array.isArray(q.options) ? [...q.options] : ["", ""];
        nextOptions[optIndex] = value;
        return { ...q, options: nextOptions };
      })
    );
  };

  const removeGeneratedOption = (qIndex, optIndexToRemove) => {
    setGeneratedQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        const cur = Array.isArray(q.options) ? q.options : ["", ""];
        if (cur.length <= 2) return q;

        const next = cur.filter((_, oi) => oi !== optIndexToRemove);
        let nextCorrect = Number(q.correctOption) || 0;
        if (optIndexToRemove === nextCorrect) nextCorrect = 0;
        if (optIndexToRemove < nextCorrect) nextCorrect -= 1;

        return {
          ...q,
          options: next,
          correctOption: Math.min(nextCorrect, next.length - 1),
        };
      })
    );
  };

  const addGeneratedOption = (qIndex) => {
    setGeneratedQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        const cur = Array.isArray(q.options) ? q.options : ["", ""];
        if (cur.length >= 5) return q;
        return { ...q, options: [...cur, ""] };
      })
    );
  };

  const handleDeleteQuestion = (indexToRemove) => {
    setGeneratedQuestions((prev) =>
      prev.filter((_, index) => index !== indexToRemove)
    );

    setEditingGeneratedIndex((prev) => {
      if (prev == null) return prev;
      if (prev === indexToRemove) return null;
      if (prev > indexToRemove) return prev - 1;
      return prev;
    });
  };

  return {
    editingGeneratedIndex,
    toggleInlineEdit,
    updateGeneratedQuestion,
    updateGeneratedOption,
    removeGeneratedOption,
    addGeneratedOption,
    handleDeleteQuestion,
    generatedQuestions,
  };
}
