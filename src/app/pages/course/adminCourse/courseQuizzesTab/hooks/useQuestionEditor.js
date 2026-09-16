import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import {
  addQuestionToQuiz,
  updateQuizQuestion,
  removeQuizQuestion,
  reorderQuizQuestions,
  addMultipleQuestionsToQuiz,
} from "$api/services/courses/quizQuestions";
import { normalizeGradedFlag } from "$api/services/courses/quizGrading";
import { generateUUID } from "../../../../../utils/courseUtils";

/**
 * Orquestra qual quiz/questão está em edição (o "card expandido") e todas as
 * escritas de questão. Recebe o retorno de `useQuestionForm` por parâmetro —
 * hook consumindo hook de forma explícita, em vez de um orquestrador único.
 */
export function useQuestionEditor({
  courseId,
  quizzes,
  slideQuizzes,
  setQuizzes,
  setSlideQuizzes,
  form,
}) {
  // `editQuiz` = quiz cujas QUESTÕES estão em edição (editor dentro do card).
  // A configuração do quiz (nota, diagnóstico, tentativas, janela) fica no
  // modal, controlado por `settingsQuiz`. São dois fluxos separados de propósito.
  const [editQuiz, setEditQuiz] = useState(null);
  const [editQuestion, setEditQuestion] = useState(null);
  const [expandedQuiz, setExpandedQuiz] = useState(null);
  const [showDeleteQuestionModal, setShowDeleteQuestionModal] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState(null);

  const questionRef = useRef(null);
  const optionsRefs = useRef([]);
  const addOptionButtonRef = useRef(null);
  const saveButtonRef = useRef(null);
  const cancelButtonRef = useRef(null);
  const editQuizRef = useRef(null);

  useEffect(() => {
    optionsRefs.current = form.newQuizOptions.map(
      (_, i) => optionsRefs.current[i] || React.createRef()
    );
  }, [form.newQuizOptions.length]);

  useEffect(() => {
    // Apenas focará no campo quando iniciarmos uma edição (não em atualizações subsequentes)
    if (editQuiz && questionRef.current && !editQuizRef.current) {
      setTimeout(() => {
        questionRef.current.focus();
      }, 100);
    }
    // Armazenamos o estado atual de editQuiz para comparação na próxima execução
    editQuizRef.current = editQuiz;
  }, [editQuiz]);

  // Funções existentes com adaptações para slides
  const handleEditQuestion = (quiz, question) => {
    setEditQuiz(quiz);
    setEditQuestion(question);
    form.setNewQuizQuestion(question.question);
    form.setNewQuestionType(question.questionType || "multiple-choice");
    form.setNewQuizImageUrl(question.imageUrl || "");
    form.setNewQuizImageWidth(question.imageWidth || "");
    form.setNewQuizImageHeight(question.imageHeight || "");

    if (question.questionType === "open-ended") {
      form.setNewQuizOptions(["", ""]);
      form.setNewQuizCorrectOption(0);
      form.setNewQuizGraded(true);
      form.setNewQuizScale("");
    } else {
      form.setNewQuizOptions([...question.options]);
      // Questão sem resposta certa não tem gabarito gravado; o 0 aqui é só o
      // estado inicial do seletor, que fica escondido enquanto o switch estiver
      // desligado.
      form.setNewQuizCorrectOption(question.correctOption ?? 0);
      form.setNewQuizGraded(normalizeGradedFlag(question.graded));
      form.setNewQuizScale(question.scale || "");
    }
  };

  // Excluir uma questão NÃO abre o editor de questões: a exclusão sai da própria
  // lista, e o quiz alvo viaja junto em `questionToDelete`.
  const handleRemoveQuestion = (quiz, questionId) => {
    setQuestionToDelete({ quiz, id: questionId });
    setShowDeleteQuestionModal(true);
  };

  const confirmRemoveQuestion = async () => {
    try {
      if (!questionToDelete?.quiz) return;

      // Parte da versão mais recente do quiz na lista: o objeto guardado no
      // modal pode ter envelhecido (outra questão editada nesse meio-tempo).
      const target = questionToDelete.quiz;
      const latestQuiz =
        (target.isSlideQuiz ? slideQuizzes : quizzes).find(
          (q) => q.videoId === target.videoId
        ) || target;

      const updatedQuiz = await removeQuizQuestion(
        courseId,
        latestQuiz,
        questionToDelete.id
      );

      if (target.isSlideQuiz) {
        setSlideQuizzes((prev) =>
          prev.map((q) => (q.videoId === target.videoId ? updatedQuiz : q))
        );
      } else {
        setQuizzes((prev) =>
          prev.map((q) => (q.videoId === target.videoId ? updatedQuiz : q))
        );
      }

      // Só atualiza o editor se ele estiver aberto NESTE quiz.
      setEditQuiz((prev) =>
        prev?.videoId === target.videoId ? updatedQuiz : prev
      );

      toast.success("Questão deletada com sucesso!");
    } catch (error) {
      console.error("Erro ao deletar questão:", error);
      toast.error(error.message || "Erro ao deletar questão no banco de dados");
    } finally {
      setShowDeleteQuestionModal(false);
      setQuestionToDelete(null);
    }
  };

  // Reflete na lista (e no editor de questões, se for o mesmo quiz) o quiz
  // atualizado por uma gravação do modal de configuração.
  const handleQuizSettingsSaved = (updatedQuiz) => {
    const applyTo = (prev) =>
      prev.map((q) => (q.videoId === updatedQuiz.videoId ? updatedQuiz : q));

    if (updatedQuiz.isSlideQuiz) {
      setSlideQuizzes(applyTo);
    } else {
      setQuizzes(applyTo);
    }
    setEditQuiz((prev) =>
      prev?.videoId === updatedQuiz.videoId ? updatedQuiz : prev
    );
  };

  // Reordena as questões de um quiz (arraste na lista). A ordem é a própria
  // ordem do array `questions`, gravada na hora do "soltar" — igual ao
  // reordenamento de conteúdos, sem depender de um botão de salvar.
  const handleReorderQuestions = async (quiz, orderedQuestions) => {
    const lista = quiz.isSlideQuiz ? slideQuizzes : quizzes;
    const setList = quiz.isSlideQuiz ? setSlideQuizzes : setQuizzes;
    const anterior = lista.find((q) => q.videoId === quiz.videoId) || quiz;

    // Atualização otimista: o arraste precisa parecer instantâneo.
    const otimista = { ...anterior, questions: orderedQuestions };
    setList((prev) =>
      prev.map((q) => (q.videoId === quiz.videoId ? otimista : q))
    );
    setEditQuiz((prev) => (prev?.videoId === quiz.videoId ? otimista : prev));

    try {
      await reorderQuizQuestions(courseId, anterior, orderedQuestions);
      toast.success("Ordem das questões salva!", { autoClose: 1200 });
    } catch (error) {
      console.error("Erro ao reordenar as questões:", error);
      // Desfaz: a lista na tela não pode mentir sobre o que está no banco.
      setList((prev) =>
        prev.map((q) => (q.videoId === quiz.videoId ? anterior : q))
      );
      setEditQuiz((prev) => (prev?.videoId === quiz.videoId ? anterior : prev));
      toast.error(error.message || "Erro ao salvar a ordem das questões");
    }
  };

  // Botão "Adicionar questões" do card expandido: alterna o editor e garante
  // que o card esteja aberto para o professor ver a lista junto.
  const handleToggleQuestionEditor = (quiz) => {
    setEditQuestion(null);
    setEditQuiz((prev) => (prev?.videoId === quiz.videoId ? null : quiz));
    setExpandedQuiz(quiz.videoId);
  };

  // Função para adicionar questões de PDF
  const handleQuestionsFromPdf = async (generatedQuestions) => {
    if (!editQuiz || generatedQuestions.length === 0) {
      toast.error("Selecione um quiz primeiro para adicionar as questões");
      return;
    }

    try {
      const formattedQuestions = generatedQuestions.map((question) => {
        const isOpenEnded =
          question.questionType === "open-ended" ||
          question.options == null ||
          !Array.isArray(question.options);

        const base = {
          id: question.id || generateUUID(),
          question: question.question,
          questionType: isOpenEnded ? "open-ended" : "multiple-choice",
        };

        // Carrega imagem opcional, se definida no editor do gerador
        if (question.imageUrl && String(question.imageUrl).trim()) {
          base.imageUrl = String(question.imageUrl).trim();
          if (Number(question.imageWidth) > 0)
            base.imageWidth = Number(question.imageWidth);
          if (Number(question.imageHeight) > 0)
            base.imageHeight = Number(question.imageHeight);
        }

        if (isOpenEnded) {
          return base;
        }

        return {
          ...base,
          options: question.options,
          correctOption: question.correctOption,
        };
      });

      const updatedQuiz = await addMultipleQuestionsToQuiz(
        courseId,
        editQuiz,
        formattedQuestions
      );

      if (editQuiz.isSlideQuiz) {
        setSlideQuizzes((prev) =>
          prev.map((q) => (q.videoId === editQuiz.videoId ? updatedQuiz : q))
        );
      } else {
        setQuizzes((prev) =>
          prev.map((q) => (q.videoId === editQuiz.videoId ? updatedQuiz : q))
        );
      }
      setEditQuiz(updatedQuiz);
    } catch (error) {
      console.error("Erro ao adicionar questões do PDF:", error);
      toast.error(error.message || "Erro ao salvar questões no banco de dados");
    }
  };

  // Auto-save de uma questão (para edição inline na lista)
  const handleAutoSaveQuestion = useCallback(
    async (quiz, questionData) => {
      if (!courseId || !quiz || !questionData?.id) return;

      const latestQuiz = (quiz.isSlideQuiz ? slideQuizzes : quizzes).find(
        (q) => q.videoId === quiz.videoId
      ) || quiz;

      const updatedQuiz = await updateQuizQuestion(
        courseId,
        latestQuiz,
        questionData
      );

      if (quiz.isSlideQuiz) {
        setSlideQuizzes((prev) =>
          prev.map((q) => (q.videoId === quiz.videoId ? updatedQuiz : q))
        );
      } else {
        setQuizzes((prev) =>
          prev.map((q) => (q.videoId === quiz.videoId ? updatedQuiz : q))
        );
      }

      setEditQuiz((prev) => (prev?.videoId === quiz.videoId ? updatedQuiz : prev));
    },
    [courseId, quizzes, slideQuizzes, setQuizzes, setSlideQuizzes]
  );

  // Adicione esta função ao componente CourseQuizzesTab (antes do return)
  const handleBlurSave = async (field) => {
    if (!editQuiz || !editQuestion) return;

    try {
      const questionData = {
        id: editQuestion.id,
        question: form.newQuizQuestion,
        options: form.newQuizOptions,
        correctOption: form.newQuizCorrectOption,
        graded: form.newQuizGraded,
        scale: form.newQuizScale,
      };

      // Atualizar a questão no quiz
      const updatedQuiz = await updateQuizQuestion(
        courseId,
        editQuiz,
        questionData
      );

      // Atualizar o estado do quiz
      if (editQuiz.isSlideQuiz) {
        setSlideQuizzes((prev) =>
          prev.map((q) => (q.videoId === editQuiz.videoId ? updatedQuiz : q))
        );
      } else {
        setQuizzes((prev) =>
          prev.map((q) => (q.videoId === editQuiz.videoId ? updatedQuiz : q))
        );
      }

      setEditQuiz(updatedQuiz);
      toast.success("Questão atualizada com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar questão:", error);
      toast.error("Erro ao salvar a questão");
    }
  };

  // Também precisamos adicionar a função handleKeyDown se não existir
  const handleKeyDown = (event) => {
    // Esta função permite salvar ao pressionar Ctrl+Enter
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      if (editQuestion) {
        handleSaveEditQuestion();
      } else {
        handleAddQuestion();
      }
    }
  };

  const handleSaveEditQuestion = async () => {
    if (!editQuiz || !editQuestion) return;

    // Validações básicas
    if (!form.newQuizQuestion.trim()) {
      toast.error("A pergunta não pode estar vazia");
      return;
    }

    const isOpenEnded = form.newQuestionType === "open-ended";

    if (!isOpenEnded && form.newQuizOptions.some((opt) => !opt.trim())) {
      toast.error("Todas as opções devem ser preenchidas");
      return;
    }

    try {
      const questionData = {
        id: editQuestion.id,
        question: form.newQuizQuestion.trim(),
        questionType: form.newQuestionType,
        imageUrl: form.newQuizImageUrl,
        imageWidth: form.newQuizImageWidth,
        imageHeight: form.newQuizImageHeight,
      };

      if (isOpenEnded) {
        // Questão aberta não precisa de campos extras
      } else {
        questionData.options = form.newQuizOptions.map((opt) => opt.trim());
        questionData.correctOption = form.newQuizCorrectOption;
        questionData.graded = form.newQuizGraded;
        questionData.scale = form.newQuizScale;
      }

      // Atualizar a questão no quiz
      const updatedQuiz = await updateQuizQuestion(
        courseId,
        editQuiz,
        questionData
      );

      // Atualizar o estado do quiz
      if (editQuiz.isSlideQuiz) {
        setSlideQuizzes((prev) =>
          prev.map((q) => (q.videoId === editQuiz.videoId ? updatedQuiz : q))
        );
      } else {
        setQuizzes((prev) =>
          prev.map((q) => (q.videoId === editQuiz.videoId ? updatedQuiz : q))
        );
      }

      setEditQuiz(updatedQuiz);
      setEditQuestion(null);
      form.resetForm();

      toast.success("Questão atualizada com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar questão:", error);
      toast.error(error.message || "Erro ao salvar a questão");
    }
  };

  const handleAddQuestion = async () => {
    if (!editQuiz) return;

    // Validações básicas
    if (!form.newQuizQuestion.trim()) {
      toast.error("A pergunta não pode estar vazia");
      return;
    }

    const isOpenEnded = form.newQuestionType === "open-ended";

    if (!isOpenEnded && form.newQuizOptions.some((opt) => !opt.trim())) {
      toast.error("Todas as opções devem ser preenchidas");
      return;
    }

    try {
      const questionData = {
        id: generateUUID(), // Gera um ID único para a nova questão
        question: form.newQuizQuestion.trim(),
        questionType: form.newQuestionType,
        imageUrl: form.newQuizImageUrl,
        imageWidth: form.newQuizImageWidth,
        imageHeight: form.newQuizImageHeight,
      };

      if (isOpenEnded) {
        // Questão aberta não precisa de campos extras
      } else {
        questionData.options = form.newQuizOptions.map((opt) => opt.trim());
        questionData.correctOption = form.newQuizCorrectOption;
        questionData.graded = form.newQuizGraded;
        questionData.scale = form.newQuizScale;
      }

      // Adicionar a questão ao quiz
      const updatedQuiz = await addQuestionToQuiz(
        courseId,
        editQuiz,
        questionData
      );

      // Atualizar o estado do quiz
      if (editQuiz.isSlideQuiz) {
        setSlideQuizzes((prev) =>
          prev.map((q) => (q.videoId === editQuiz.videoId ? updatedQuiz : q))
        );
      } else {
        setQuizzes((prev) =>
          prev.map((q) => (q.videoId === editQuiz.videoId ? updatedQuiz : q))
        );
      }

      setEditQuiz(updatedQuiz);
      form.resetForm();

      toast.success("Questão adicionada com sucesso!");
    } catch (error) {
      console.error("Erro ao adicionar questão:", error);
      toast.error(error.message || "Erro ao adicionar a questão");
    }
  };

  // Usado ao trocar de aba: fecha o editor de questões sem mexer no
  // formulário de criação de quiz (isso é responsabilidade de quem chama).
  const resetEditingState = () => {
    setEditQuiz(null);
    setEditQuestion(null);
  };

  return {
    editQuiz,
    setEditQuiz,
    editQuestion,
    setEditQuestion,
    expandedQuiz,
    setExpandedQuiz,
    showDeleteQuestionModal,
    setShowDeleteQuestionModal,
    questionToDelete,
    setQuestionToDelete,
    questionRef,
    optionsRefs,
    addOptionButtonRef,
    saveButtonRef,
    cancelButtonRef,
    handleEditQuestion,
    handleRemoveQuestion,
    confirmRemoveQuestion,
    handleQuizSettingsSaved,
    handleReorderQuestions,
    handleToggleQuestionEditor,
    handleQuestionsFromPdf,
    handleAutoSaveQuestion,
    handleBlurSave,
    handleKeyDown,
    handleSaveEditQuestion,
    handleAddQuestion,
    resetEditingState,
  };
}
