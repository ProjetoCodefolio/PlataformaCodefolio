import { useState } from "react";
import { toast } from "react-toastify";
import { addQuiz } from "$api/services/courses/quizCrud";
import { notifyNewQuiz } from "$api/services/notifications";

/**
 * Formulário de CRIAÇÃO de um novo quiz (aba de vídeo/conteúdo OU aba de
 * slide legado, decidido por `activeTab`). A edição de um quiz já existente
 * vive em `QuizSettingsModal`, fluxo separado de propósito.
 */
export function useQuizCreationForm({
  courseId,
  courseTitle,
  videosState,
  slidesState,
  quizzes,
  slideQuizzes,
  setQuizzes,
  setSlideQuizzes,
  onQuizAdded,
}) {
  const [activeTab, setActiveTab] = useState(0); // 0 = Videos, 1 = Slides
  const [newQuizVideoId, setNewQuizVideoId] = useState("");
  const [newQuizSlideId, setNewQuizSlideId] = useState("");
  const [newQuizMinPercentage, setNewQuizMinPercentage] = useState(0);
  const [newQuizIsDiagnostic, setNewQuizIsDiagnostic] = useState(false);
  const [newQuizAllowRetry, setNewQuizAllowRetry] = useState(true);
  const [newQuizMaxAttempts, setNewQuizMaxAttempts] = useState("");
  // Janela de disponibilidade do novo quiz (datas ISO; "" = sem restrição).
  const [newQuizOpenDate, setNewQuizOpenDate] = useState("");
  const [newQuizCloseDate, setNewQuizCloseDate] = useState("");

  // A abertura precisa vir antes do encerramento — senão o quiz nasceria
  // impossível de responder.
  const isScheduleValid = () => {
    if (
      newQuizOpenDate &&
      newQuizCloseDate &&
      new Date(newQuizOpenDate).getTime() >= new Date(newQuizCloseDate).getTime()
    ) {
      toast.error(
        "A data de abertura deve ser anterior à data de encerramento."
      );
      return false;
    }
    return true;
  };

  // Função para adicionar quiz (adaptada para vídeos e slides)
  const handleAddQuiz = async () => {
    if (activeTab === 0) {
      // Quiz para vídeo
      if (!newQuizVideoId) {
        toast.error("Selecione um vídeo para o quiz");
        return;
      }

      if (quizzes.some((quiz) => quiz.videoId === newQuizVideoId)) {
        toast.error("Já existe um quiz associado a este vídeo");
        return;
      }

      if (!isScheduleValid()) return;

      try {
        const newQuiz = await addQuiz(
          courseId,
          newQuizVideoId,
          newQuizMinPercentage,
          newQuizIsDiagnostic,
          newQuizAllowRetry,
          newQuizMaxAttempts,
          { openDate: newQuizOpenDate, closeDate: newQuizCloseDate }
        );

        // Avisa a turma. Com a janela de disponibilidade, criar o quiz é o
        // momento do lançamento: sem data de abertura ele já está no ar; com
        // data, o aviso diz quando abre.
        notifyNewQuiz(
          courseId,
          {
            id: newQuizVideoId,
            title:
              videosState.find((v) => v.id === newQuizVideoId)?.title ||
              "Novo quiz",
            openDate: newQuizOpenDate,
            closeDate: newQuizCloseDate,
            minPercentage: newQuizMinPercentage,
            isDiagnostic: newQuizIsDiagnostic,
            allowRetry: newQuizAllowRetry,
            maxAttempts: newQuizMaxAttempts,
          },
          courseTitle
        );

        setQuizzes((prev) => [...prev, newQuiz]);
        setNewQuizVideoId(videosState[0]?.id || "");
        setNewQuizMinPercentage(0);
        setNewQuizIsDiagnostic(false);
        setNewQuizAllowRetry(true);
        setNewQuizMaxAttempts("");
        setNewQuizOpenDate("");
        setNewQuizCloseDate("");
        onQuizAdded();
        toast.success("Quiz adicionado com sucesso!");
      } catch (error) {
        console.error("Erro ao adicionar quiz:", error);
        toast.error(error.message || "Erro ao adicionar o quiz");
      }
    } else if (activeTab === 1) {
      // Quiz para slide
      if (!newQuizSlideId) {
        toast.error("Selecione um slide para o quiz");
        return;
      }

      if (slideQuizzes.some((quiz) => quiz.slideId === newQuizSlideId)) {
        toast.error("Já existe um quiz associado a este slide");
        return;
      }

      if (!isScheduleValid()) return;

      try {
        const slidePrefix = `slide_${newQuizSlideId}`;
        const newQuiz = await addQuiz(
          courseId,
          slidePrefix,
          newQuizMinPercentage,
          newQuizIsDiagnostic,
          newQuizAllowRetry,
          newQuizMaxAttempts,
          { openDate: newQuizOpenDate, closeDate: newQuizCloseDate }
        );

        newQuiz.isSlideQuiz = true;
        newQuiz.slideId = newQuizSlideId;

        notifyNewQuiz(
          courseId,
          {
            id: slidePrefix,
            title:
              slidesState.find((s) => s.id === newQuizSlideId)?.title ||
              "Novo quiz",
            openDate: newQuizOpenDate,
            closeDate: newQuizCloseDate,
            minPercentage: newQuizMinPercentage,
            isDiagnostic: newQuizIsDiagnostic,
            allowRetry: newQuizAllowRetry,
            maxAttempts: newQuizMaxAttempts,
          },
          courseTitle
        );

        setSlideQuizzes((prev) => [...prev, newQuiz]);
        setNewQuizSlideId(slidesState[0]?.id || "");
        setNewQuizMinPercentage(0);
        setNewQuizIsDiagnostic(false);
        setNewQuizAllowRetry(true);
        setNewQuizMaxAttempts("");
        setNewQuizOpenDate("");
        setNewQuizCloseDate("");
        onQuizAdded();
        toast.success("Quiz do slide adicionado com sucesso!");
      } catch (error) {
        console.error("Erro ao adicionar quiz do slide:", error);
        toast.error(error.message || "Erro ao adicionar o quiz");
      }
    }
  };

  // Muda de aba e inicializa a seleção do formulário de criação (a limpeza
  // do editor de questões fica a cargo de quem chama, fora deste hook).
  const handleTabChanged = (newValue) => {
    setActiveTab(newValue);

    if (newValue === 0 && videosState.length > 0 && !newQuizVideoId) {
      setNewQuizVideoId(videosState[0].id);
    } else if (newValue === 1 && slidesState.length > 0 && !newQuizSlideId) {
      setNewQuizSlideId(slidesState[0].id);
    }
  };

  return {
    activeTab,
    newQuizVideoId,
    setNewQuizVideoId,
    newQuizSlideId,
    setNewQuizSlideId,
    newQuizMinPercentage,
    setNewQuizMinPercentage,
    newQuizIsDiagnostic,
    setNewQuizIsDiagnostic,
    newQuizAllowRetry,
    setNewQuizAllowRetry,
    newQuizMaxAttempts,
    setNewQuizMaxAttempts,
    newQuizOpenDate,
    setNewQuizOpenDate,
    newQuizCloseDate,
    setNewQuizCloseDate,
    isScheduleValid,
    handleAddQuiz,
    handleTabChanged,
  };
}
