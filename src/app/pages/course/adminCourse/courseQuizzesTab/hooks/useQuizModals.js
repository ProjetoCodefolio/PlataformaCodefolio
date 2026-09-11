import { useState } from "react";

/**
 * Estado dos modais/overlays independentes do editor de questão (import,
 * configurações do quiz, sucesso ao adicionar, exclusão de quiz, resultados
 * de opinião). O modal de exclusão de QUESTÃO fica em `useQuestionEditor`,
 * por ser privado àquele fluxo.
 */
export function useQuizModals() {
  const [showImportQuizModal, setShowImportQuizModal] = useState(false);
  const [settingsQuiz, setSettingsQuiz] = useState(null);
  const [showAddQuizModal, setShowAddQuizModal] = useState(false);
  const [showDeleteQuizModal, setShowDeleteQuizModal] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState(null);
  const [opinionQuiz, setOpinionQuiz] = useState(null);

  return {
    showImportQuizModal,
    setShowImportQuizModal,
    settingsQuiz,
    setSettingsQuiz,
    showAddQuizModal,
    setShowAddQuizModal,
    showDeleteQuizModal,
    setShowDeleteQuizModal,
    quizToDelete,
    setQuizToDelete,
    opinionQuiz,
    setOpinionQuiz,
  };
}
