import { useEffect, useState } from "react";
import { toast } from "react-toastify";

/**
 * Exibição de slide (legado e independente) e navegação de volta ao vídeo de
 * origem. Recebe `currentVideoId`/`setCurrentVideoId` (cross-cutting, dono é
 * `Classes`), `videos`/`slides` (de `useCourseContent`) e `setShowQuiz` (de
 * `useQuizFlow`) por parâmetro.
 */
export function useSlideNavigation({
  currentVideoId,
  setCurrentVideoId,
  currentVideo,
  videos,
  slides,
  setShowQuiz,
}) {
  const [showSlidePlayer, setShowSlidePlayer] = useState(false);
  const [slideData, setSlideData] = useState(null);
  const [videoIdBeforeSlide, setVideoIdBeforeSlide] = useState(null);

  useEffect(() => {
    if (!currentVideo) {
      return;
    }

    if (currentVideo.isSlide) {
      setSlideData(currentVideo);
      setShowSlidePlayer(true);
    } else {
      setShowSlidePlayer(false);
      setSlideData(null);
    }
  }, [currentVideo]);

  const activeSlide = slideData || (currentVideo?.isSlide ? currentVideo : null);
  const shouldShowSlidePlayer = showSlidePlayer || Boolean(activeSlide);

  // Modificar a função handleOpenSlide para que funcione com slides independentes
  // Também fecha o Quiz, para que o usuário veja o Slide ao abrir.
  const handleOpenSlide = (slideOrContext = null, videoIdArg = null, quizIdArg = null) => {
    setShowQuiz(false);

    // Se recebemos o slide diretamente (novo caso para slides independentes)
    if (slideOrContext && typeof slideOrContext === "object" && slideOrContext.isSlide) {
      if (currentVideoId && !currentVideo?.isSlide) {
        setVideoIdBeforeSlide(currentVideoId);
      }

      setCurrentVideoId(slideOrContext.id);
      setSlideData(slideOrContext);
      setShowSlidePlayer(true);
      return;
    }

    // Caso contrário, procura pelos slides associados a vídeo ou quiz
    let slideToShow = null;

    const ctxObj = slideOrContext && typeof slideOrContext === "object" ? slideOrContext : null;
    const resolvedVideoId = videoIdArg || ctxObj?.videoId || (typeof slideOrContext === "string" ? slideOrContext : null) || currentVideoId;
    const resolvedQuizId = quizIdArg || ctxObj?.quizId || null;

    if (resolvedVideoId) {
      const slidesForVideo = slides.filter((s) => s?.videoId === resolvedVideoId);
      if (slidesForVideo.length > 0) {
        slideToShow = slidesForVideo[0];
      }
    }

    if (!slideToShow && resolvedQuizId) {
      const slidesForQuiz = slides.filter((s) => s?.quizId === resolvedQuizId);
      if (slidesForQuiz.length > 0) {
        slideToShow = slidesForQuiz[0];
      }
    }

    // Fallback: quizId no formato `${courseId}/slide_${slideId}`
    if (!slideToShow && resolvedQuizId && resolvedQuizId.includes("slide_")) {
      const slideId = resolvedQuizId.split("slide_")[1];
      slideToShow = slides.find((s) => s?.id === slideId) || null;
    }

    if (slideToShow) {
      // Guardar vídeo de origem para retorno
      if (slideToShow.videoId) {
        setVideoIdBeforeSlide(slideToShow.videoId);
      } else if (currentVideoId && !currentVideo?.isSlide) {
        setVideoIdBeforeSlide(currentVideoId);
      }

      setCurrentVideoId(slideToShow.id);
      setSlideData(slideToShow);
      setShowSlidePlayer(true);
    } else {
      toast.info("Nenhum slide encontrado para este conteúdo.");
    }
  };

  const handleReturnToVideo = () => {
    setShowSlidePlayer(false);
    setSlideData(null);

    // Sempre garantir que saímos do modo quiz ao voltar
    setShowQuiz(false);

    if (videoIdBeforeSlide) {
      setCurrentVideoId(videoIdBeforeSlide);
      setVideoIdBeforeSlide(null);
      return;
    }

    // Fallback: se estivermos em um slide sem vídeo anterior, voltar para o primeiro vídeo (não-slide)
    const firstVideo = videos.find((v) => !v?.isSlide && v?.type !== "slide");
    if (firstVideo?.id) {
      setCurrentVideoId(firstVideo.id);
    }
  };

  // Adicionar esta função de verificação de slides antes do retorno do componente
  const hasSlide = (videoId) => {
    if (!videoId || !slides) return false;

    // Verificar se existe algum slide associado a este videoId
    const slideForVideo = slides.find((slide) => slide.videoId === videoId);
    return !!slideForVideo;
  };

  // `videoSlides` (estado que alimentava esta função) nunca era populado em
  // lugar nenhum do sistema — o resultado já era sempre `false`. Estado morto
  // removido nesta refatoração; a função fica só pela assinatura que os
  // chamadores esperam.
  const hasQuizSlide = (_quizId) => false;

  return {
    showSlidePlayer,
    slideData,
    videoIdBeforeSlide,
    setVideoIdBeforeSlide,
    activeSlide,
    shouldShowSlidePlayer,
    handleOpenSlide,
    handleReturnToVideo,
    hasSlide,
    hasQuizSlide,
  };
}
