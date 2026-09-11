import { useState } from "react";

/**
 * Campos do formulário de UMA questão, compartilhado entre criar e editar
 * (o que diferencia os dois é `editQuestion`, em `useQuestionEditor`).
 */
export function useQuestionForm() {
  const [newQuizQuestion, setNewQuizQuestion] = useState("");
  const [newQuizOptions, setNewQuizOptions] = useState(["", ""]);
  const [newQuizCorrectOption, setNewQuizCorrectOption] = useState(0);
  // "Esta pergunta tem resposta certa": desligado, a questão não vale nota e
  // não pede gabarito (é o que permite a escala Likert sem induzir resposta).
  const [newQuizGraded, setNewQuizGraded] = useState(true);
  const [newQuizScale, setNewQuizScale] = useState("");

  // Imagem opcional da questão (URL + dimensões em px)
  const [newQuizImageUrl, setNewQuizImageUrl] = useState("");
  const [newQuizImageWidth, setNewQuizImageWidth] = useState("");
  const [newQuizImageHeight, setNewQuizImageHeight] = useState("");

  // Novos estados para questões abertas
  const [newQuestionType, setNewQuestionType] = useState("multiple-choice");

  const handleAddQuizOption = () => {
    if (newQuizOptions.length < 5) {
      setNewQuizOptions((prev) => [...prev, ""]);
    }
  };

  const handleRemoveQuizOption = (indexToRemove) => {
    if (newQuizOptions.length > 2) {
      setNewQuizOptions((prev) =>
        prev.filter((_, index) => index !== indexToRemove)
      );
      if (newQuizCorrectOption >= newQuizOptions.length - 1) {
        setNewQuizCorrectOption(newQuizOptions.length - 2);
      }
    }
  };

  // Mesma sequência de reset usada, idêntica, ao final de uma criação ou de
  // uma edição de questão bem-sucedida.
  const resetForm = () => {
    setNewQuizQuestion("");
    setNewQuizOptions(["", ""]);
    setNewQuizCorrectOption(0);
    setNewQuizGraded(true);
    setNewQuizScale("");
    setNewQuestionType("multiple-choice");
    setNewQuizImageUrl("");
    setNewQuizImageWidth("");
    setNewQuizImageHeight("");
  };

  return {
    newQuizQuestion,
    setNewQuizQuestion,
    newQuizOptions,
    setNewQuizOptions,
    newQuizCorrectOption,
    setNewQuizCorrectOption,
    newQuizGraded,
    setNewQuizGraded,
    newQuizScale,
    setNewQuizScale,
    newQuizImageUrl,
    setNewQuizImageUrl,
    newQuizImageWidth,
    setNewQuizImageWidth,
    newQuizImageHeight,
    setNewQuizImageHeight,
    newQuestionType,
    setNewQuestionType,
    handleAddQuizOption,
    handleRemoveQuizOption,
    resetForm,
  };
}
