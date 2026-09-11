import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { fetchUserQuizResults } from "$api/services/courses/quizFetch";
import { validateQuizAnswers } from "$api/services/courses/quizSubmission";
import {
  processQuizCompletion,
  checkCourseCompletion,
  loadQuizData,
} from "$api/services/courses/classes";
import { updateCourseProgress } from "$api/services/courses/students";

/**
 * Núcleo do fluxo de quiz: exibição, início (com porta de entrada e diálogo
 * de confirmação), submissão, conclusão, revisão de tentativa e Quiz Gigi.
 * Estado/refs cross-cutting (`currentVideoId`, `videos`, `videoPlayerRef`,
 * `setUserAttempts`, `setShowCompletionModal`, `slideData`) chegam por
 * parâmetro, na mesma linha do resto desta decomposição.
 */
export function useQuizFlow({
  courseId,
  userDetails,
  currentVideoId,
  setCurrentVideoId,
  currentVideo,
  videos,
  setVideos,
  setUserAttempts,
  setShowCompletionModal,
  videoPlayerRef,
  slideData,
  scrollToContent,
  getQuizResultKey,
  requestQuizStart,
}) {
  const [showQuiz, setShowQuiz] = useState(false);
  // Adicionar uma verificação para determinar se o quiz é de vídeo ou slide
  const [quizSource, setQuizSource] = useState("video"); // Pode ser "video" ou "slide"
  // Quiz cuja última tentativa está sendo revisada (leitura pura, não
  // consome tentativa nem passa pela porta de entrada canEnterQuiz):
  // { quizId, quizKey }.
  const [reviewingQuiz, setReviewingQuiz] = useState(null);
  const [showQuizGigi, setShowQuizGigi] = useState(false);
  const [quizData, setQuizData] = useState(null);

  // Escuta evento de retorno ao vídeo
  useEffect(() => {
    const handleReturnToVideo = (event) => {
      setShowQuiz(false);
      if (event.detail && event.detail.videoId) {
        setCurrentVideoId(event.detail.videoId);
      }
    };

    window.addEventListener("returnToVideo", handleReturnToVideo);

    return () => {
      window.removeEventListener("returnToVideo", handleReturnToVideo);
    };
  }, []);

  // Espelha em `userAttempts` o que está GRAVADO no banco. É uma leitura pura:
  // nenhuma tentativa é criada/incrementada aqui — isso é exclusividade de
  // saveQuizResults, que só roda quando o aluno realmente submete o quiz.
  const refreshUserAttempts = useCallback(async () => {
    if (!userDetails?.userId || !courseId) return;
    try {
      const attempts = await fetchUserQuizResults(userDetails.userId, courseId);
      setUserAttempts(attempts || {});
    } catch (error) {
      console.error("Erro ao atualizar tentativas:", error);
    }
  }, [userDetails?.userId, courseId]);

  // Atualiza tentativas de quiz quando fecha o quiz.
  //
  // ATENÇÃO: aqui já se chamava `processQuizCompletion(true, ...)` só para
  // aproveitar o retorno com as tentativas. Aquela função ESCREVE (marca vídeo
  // concluído + quiz aprovado), então sair do quiz sem responder criava um
  // resultado fantasma (isPassed: true, attemptCount: 1) e queimava a tentativa
  // do aluno — além de forjar aprovação, progresso e presença. Fechar o quiz
  // não é um evento de conclusão: só relê o que já está no banco.
  const [previousShowQuiz, setPreviousShowQuiz] = useState(showQuiz);
  useEffect(() => {
    if (previousShowQuiz && !showQuiz) {
      refreshUserAttempts();
    }

    setPreviousShowQuiz(showQuiz);
  }, [showQuiz]);

  // Função para navegar para o próximo vídeo
  const handleNextVideo = () => {
    const currentVideoIndex = videos.findIndex((v) => v.id === currentVideoId);
    if (currentVideoIndex < videos.length - 1) {
      const nextVideo = videos[currentVideoIndex + 1];
      setCurrentVideoId(nextVideo.id);
      setShowQuiz(false);
      scrollToContent();
    }
  };

  const handleQuizComplete = async (isPassed, action, videoId, quizResultId = null, isSlide = false) => {
    try {
      // Garantir que isPassed seja um booleano
      const wasApproved = Boolean(isPassed);

      // Identifica se é um slide ou um vídeo que estamos atualizando
      const contentId = videoId || currentVideoId;

      // As tentativas exibidas vêm do banco (refreshUserAttempts). Não somamos
      // +1 aqui: uma única submissão passa por este handler até três vezes
      // (onComplete → onSubmit → botão "Voltar ao Vídeo"), o que inflava o
      // contador e podia mostrar "Limite Atingido" antes da hora. Quem conta a
      // tentativa é saveQuizResults, dentro do componente do quiz.

      // Continue with the rest of the function
      if (wasApproved) {
        // Identifica se é um slide ou um vídeo que estamos atualizando
        const contentId = videoId || currentVideoId;

        // Atualiza estado local de vídeos/slides
        const updatedVideos = videos.map((v) =>
          v.id === contentId ? { ...v, quizPassed: true, watched: true } : v
        );
        setVideos(updatedVideos);

        // Se o usuário está logado, processa a conclusão do quiz
        if (userDetails?.userId) {
          // Obter duração do vídeo ou valor padrão para slides
          const duration =
            quizSource === "video" && videoPlayerRef.current
              ? videoPlayerRef.current.getDuration?.() ||
              currentVideo?.watchedTime ||
              0
              : 1; // Para slides, usamos 1 como duração padrão

          // Processa conclusão no serviço
          const result = await processQuizCompletion(
            true,
            userDetails.userId,
            courseId,
            contentId,
            duration,
            quizSource === "slide",
            getQuizResultKey(contentId)
          );

          if (result?.attempts) {
            setUserAttempts(result.attempts);
          }

          // Passar no quiz pode concluir o conteúdo (watched + quizPassed), então
          // recalcula o progresso agregado em tempo real — antes o valor só
          // mudava ao recarregar o curso.
          const progressVideos = updatedVideos.filter(
            (v) => v && !v.isIndependent
          );
          updateCourseProgress(userDetails.userId, courseId, progressVideos);
        } else {
          // Salva progresso local para usuários não logados
          sessionStorage.setItem(
            "videoProgress",
            JSON.stringify(updatedVideos)
          );
        }

        // Verifica conclusão do curso (vídeos de entrega agora contam).
        const isCompleted = await checkCourseCompletion(
          updatedVideos,
          userDetails?.userId,
          courseId
        );

        if (isCompleted) {
          setShowCompletionModal(true);
        }
      }

      // IMPORTANTE: Esta parte deve estar FORA do bloco if(wasApproved)
      // para que os botões funcionem independentemente do resultado do quiz
      if (action === "returnToVideo") {
        setShowQuiz(false);
        if (videoId) {
          setCurrentVideoId(videoId);
        }
      } else if (action === "nextVideo") {
        handleNextVideo();
      }
    } catch (error) {
      console.error("Erro ao processar conclusão do quiz:", error);
      toast.error("Erro ao processar o quiz. Por favor, tente novamente.");
    }
  };

  // Abre a revisão de uma tentativa já feita. Leitura pura: não passa por
  // canEnterQuiz (não é uma nova entrada no quiz, é olhar o que já foi
  // respondido) e não consome tentativa.
  const handleReviewQuiz = (quizId) => {
    if (!quizId) return;
    const quizKey = quizId.includes("/") ? quizId.split("/")[1] : quizId;
    const fullQuizId = quizId.includes("/") ? quizId : `${courseId}/${quizId}`;
    setReviewingQuiz({ quizId: fullQuizId, quizKey });
  };

  const handleQuizStart = (quizId, videoId) => {
    requestQuizStart(quizId, () => {
      setCurrentVideoId(videoId);

      // Detectar se é um quiz de slide ou de vídeo
      const isSlideQuiz =
        quizId.includes("slide_") ||
        videos.find((v) => v.id === videoId)?.isSlide;
      setQuizSource(isSlideQuiz ? "slide" : "video");

      setShowQuiz(true);
      // Dentro do callback, e não no clique: quizzes com tentativas contadas
      // abrem um diálogo de confirmação antes, e rolar com ele aberto seria
      // rolar a página por trás do modal.
      scrollToContent();
    });
  };

  // Modificar a função que mostra o quiz
  const handleShowQuiz = (videoId, source = "video") => {
    // Este caminho (botões do player/slide) também respeita o limite de
    // tentativas — antes só a lista de conteúdos verificava.
    const contentId = typeof videoId === "string" ? videoId : currentVideoId;

    requestQuizStart(getQuizResultKey(contentId), () => {
      if (typeof videoId === "string") {
        setCurrentVideoId(videoId);
      }
      setQuizSource(source);
      setShowQuiz(true);
      scrollToContent();
    });
  };

  const handleQuizSubmit = async (userAnswers) => {
    try {
      // Verificar se userAnswers é um objeto válido
      if (!userAnswers || typeof userAnswers !== "object") {
        console.error("Respostas do quiz inválidas:", userAnswers);
        return;
      }

      const quizResultId = getQuizResultKey(currentVideoId);

      const { isPassed } = await validateQuizAnswers(
        `${courseId}/${quizResultId}`,
        userAnswers,
        currentVideo?.minPercentage || 70
      );

      await handleQuizComplete(isPassed, null, currentVideoId, quizResultId, quizSource === "slide");

      // A submissão acabou de incrementar a tentativa no banco (saveQuizResults):
      // relê para a lista de conteúdos refletir o número real, inclusive quando
      // o aluno é reprovado.
      await refreshUserAttempts();
    } catch (error) {
      console.error("Erro ao validar respostas do quiz:", error);
      toast.error("Erro ao processar o quiz. Por favor, tente novamente.");
    }
  };

  const handleOpenQuizGigi = async () => {
    const quizId =
      currentVideo?.quizId ||
      slideData?.quizId ||
      (currentVideo?.isSlide && courseId && currentVideo?.id
        ? `${courseId}/slide_${currentVideo.id}`
        : null) ||
      (slideData?.isSlide && courseId && slideData?.id
        ? `${courseId}/slide_${slideData.id}`
        : null);

    if (quizId) {
      if (
        videoPlayerRef.current &&
        typeof videoPlayerRef.current.pause === "function"
      ) {
        videoPlayerRef.current.pause();
      }

      try {
        const quiz = await loadQuizData(quizId);
        if (!quiz) {
          toast.error("Quiz não encontrado.");
          return;
        }

        const quizKey = quizId.split("/")[1] || quizId;
        setQuizData({
          ...quiz,
          id: quizKey,
        });
        setShowQuizGigi(true);
      } catch (error) {
        console.error("Erro ao carregar quiz:", error);
      }
    }
  };

  return {
    showQuiz,
    setShowQuiz,
    quizSource,
    reviewingQuiz,
    setReviewingQuiz,
    showQuizGigi,
    setShowQuizGigi,
    quizData,
    handleNextVideo,
    handleQuizComplete,
    handleReviewQuiz,
    handleQuizStart,
    handleShowQuiz,
    handleQuizSubmit,
    handleOpenQuizGigi,
  };
}
