import { useCallback, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { VideoPlayer } from "$components/courses/videoPlayerClasses";
import VideoList from "$components/courses/videoList";
import MaterialExtra from "$components/courses/extraMaterials";
import Quiz from "$components/courses/quiz";
import Loader from "$components/common/Loader";
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import Topbar from "$components/topbar/Topbar";
import { useAuth } from "$context/AuthContext";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import LoginModal from "$components/modals/LoginModal";
import CompletionModal from "$components/modals/CompletionModal";
import QuizGigi from "$components/courses/quizGigi";
import SlidePlayer from "$components/courses/slidePlayer";
import { saveVideoProgress } from "$api/services/courses/videoProgress";
import {
  getQuizAttemptLimit,
  hasUserReachedQuizAttemptLimit,
  isQuizAfterClose,
  formatQuizDate,
} from "$api/services/courses/quizWindow";
import { formatTimeRemaining } from "$api/services/courses/assignments";
import PinAccessModal from "$components/modals/PinAccessModal";
import { updateCourseProgress } from "$api/services/courses/students";
import AdvancedSettingsModal from "$components/courses/AdvancedSettingsModal";
import AssignmentList from "$components/courses/assignments/AssignmentList";
import QuestionFormModal from "$components/courses/questions/QuestionFormModal";
import QuizAnswersReview from "$components/courses/quiz/QuizAnswersReview";
import QuizDeadlineChip from "$components/courses/quiz/QuizDeadlineChip";

import { useCourseIdentity } from "./hooks/useCourseIdentity";
import { useCourseAccess } from "./hooks/useCourseAccess";
import { useAuxModals } from "./hooks/useAuxModals";
import { useAdvancedSettingsPanel } from "./hooks/useAdvancedSettingsPanel";
import { useCourseContent } from "./hooks/useCourseContent";
import { useSlideNavigation } from "./hooks/useSlideNavigation";
import { useQuizGate } from "./hooks/useQuizGate";
import { useQuizFlow } from "./hooks/useQuizFlow";
import { useStudentQuestions } from "./hooks/useStudentQuestions";
import { useSuppressYoutubeWarning } from "./hooks/useSuppressYoutubeWarning";

const Classes = ({ alias = null, openQuestions = false }) => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const { userDetails } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobileLayout = useMediaQuery(theme.breakpoints.down("md"));

  const videoPlayerRef = useRef({
    pause: () => { },
    getCurrentTime: () => 0,
    getDuration: () => 0,
    seekTo: () => { },
  });
  // Topo da área de conteúdo (vídeo, slide ou quiz). No mobile o layout é uma
  // coluna com a lista de conteúdos ABAIXO do player: sem rolar até aqui, o
  // clique na lista parece não fazer nada.
  const contentTopRef = useRef(null);

  const [selectedTab, setSelectedTab] = useState(0);

  const { courseId } = useCourseIdentity({
    alias,
    initialCourseId: params.get("courseId"),
    navigate,
  });

  const courseAccess = useCourseAccess({ courseId, userDetails, navigate });
  const auxModals = useAuxModals();
  const advancedSettingsPanel = useAdvancedSettingsPanel(courseId);

  // `?videoId=` permite que um link externo (ex.: /cursos/{apelido}/questions)
  // abra a sala já no conteúdo certo. Se o id não existir no curso, o
  // carregamento reverte para a escolha padrão.
  const [currentVideoId, setCurrentVideoId] = useState(params.get("videoId"));
  const [userAttempts, setUserAttempts] = useState({});
  // Configuração de tentativas por quiz (allowRetry/maxAttempts), chaveada pelo
  // id do conteúdo (mesma chave usada em userAttempts e em video.quizId).
  const [quizSettings, setQuizSettings] = useState({});

  const courseContent = useCourseContent({
    courseId,
    userDetails,
    accessGranted: courseAccess.accessGranted,
    currentVideoId,
    setCurrentVideoId,
    videoPlayerRef,
    setUserAttempts,
    setQuizSettings,
    setShowCompletionModal: auxModals.setShowCompletionModal,
    navigate,
  });

  // Conteúdo com a situação da janela do quiz anexada (`quizClosed`). A trava
  // sequencial e a navegação do player precisam saber que um quiz encerrado não
  // bloqueia mais o curso — quem perdeu o prazo não tem como fazê-lo.
  const contentItems = useMemo(
    () =>
      courseContent.videos.map((item) => {
        if (!item?.quizId) return item;
        const quizKey = item.quizId.includes("/")
          ? item.quizId.split("/")[1]
          : item.quizId;
        return {
          ...item,
          quizClosed: isQuizAfterClose(quizSettings[quizKey]),
        };
      }),
    [courseContent.videos, quizSettings]
  );

  const currentVideo = contentItems.find((video) => video.id === currentVideoId);

  // Leva o aluno até o conteúdo escolhido. Só no mobile: no desktop a lista
  // fica ao lado do player, então rolar seria só um solavanco. O atraso deixa o
  // novo conteúdo montar antes de medir a posição (mesmo padrão de
  // CourseSlidesTab/CourseContentTab). Só é chamado nos caminhos de sucesso —
  // conteúdo bloqueado continua apenas avisando por toast, sem rolar a página.
  const scrollToContent = useCallback(() => {
    if (!isMobileLayout) return;
    setTimeout(() => {
      contentTopRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  }, [isMobileLayout]);

  // Chave do quiz/resultado de um conteúdo: slides LEGADOS usam o prefixo
  // `slide_` (courseQuizzes/{courseId}/slide_{id}); itens da nova collection
  // unificada (mesmo sendo slides) e vídeos usam o id puro.
  const getQuizResultKey = (id) => {
    const item = courseContent.videos.find((v) => v.id === id);
    return item?.isSlide && !item?.isContentItem ? `slide_${id}` : id;
  };

  const quizGate = useQuizGate({
    contentItems,
    quizSettings,
    userAttempts,
    getQuizResultKey,
  });

  const quizFlow = useQuizFlow({
    courseId,
    userDetails,
    currentVideoId,
    setCurrentVideoId,
    currentVideo,
    videos: courseContent.videos,
    setVideos: courseContent.setVideos,
    setUserAttempts,
    setShowCompletionModal: auxModals.setShowCompletionModal,
    videoPlayerRef,
    scrollToContent,
    getQuizResultKey,
    requestQuizStart: quizGate.requestQuizStart,
  });

  const slideNav = useSlideNavigation({
    currentVideoId,
    setCurrentVideoId,
    currentVideo,
    videos: courseContent.videos,
    slides: courseContent.slides,
    setShowQuiz: quizFlow.setShowQuiz,
  });

  // Item cujo quiz está "em tela": o slide aberto no player de slides ou,
  // fora dele, o conteúdo atual. Buscado em contentItems para ter quizPassed.
  const playerQuizItem =
    slideNav.shouldShowSlidePlayer && slideNav.activeSlide
      ? contentItems.find((item) => item.id === slideNav.activeSlide.id) ||
        slideNav.activeSlide
      : currentVideo;
  const getQuizKey = (quizId) =>
    quizId?.includes("/") ? quizId.split("/")[1] : quizId;

  const studentQuestions = useStudentQuestions({
    openQuestions,
    accessGranted: courseAccess.accessGranted,
    loadingVideos: courseContent.loadingVideos,
    videosLength: courseContent.videos.length,
    userDetails,
    courseId,
    courseTitle: courseContent.courseTitle,
    onRequireLogin: () => auxModals.setShowLogInModal(true),
  });

  useSuppressYoutubeWarning();

  const handleVideoSelect = (video) => {
    // Se o usuário escolheu outro conteúdo, sair do modo quiz
    quizFlow.setShowQuiz(false);

    // Se for slide ou se a configuração não exigir completar vídeo anterior, permitir acesso direto
    if (
      video.isSlide ||
      advancedSettingsPanel.advancedSettings?.videos?.requirePreviousCompletion === false
    ) {
      // Guardar o vídeo atual para conseguir voltar ao vídeo após visualizar slide
      if (video.isSlide && currentVideoId && !currentVideo?.isSlide) {
        slideNav.setVideoIdBeforeSlide(currentVideoId);
      }
      setCurrentVideoId(video.id);
      scrollToContent();
      return;
    }

    // Lógica padrão para verificar bloqueio
    const videos = courseContent.videos;
    const videoIndex = videos.findIndex((v) => v.id === video.id);
    const previousVideo = videoIndex > 0 ? videos[videoIndex - 1] : null;

    if (
      videoIndex === 0 ||
      !previousVideo ||
      previousVideo.watched ||
      (previousVideo.quizId && previousVideo.quizPassed) ||
      !video.requiresPrevious
    ) {
      setCurrentVideoId(video.id);
      scrollToContent();
    } else {
      toast.warning("Você precisa assistir ao vídeo anterior primeiro!");
    }
  };

  const handleVideoProgressUpdate = (
    videoId,
    percentage,
    hasReached90Percent
  ) => {
    if (hasReached90Percent) {
      const updatedVideos = courseContent.videos.map((v) =>
        v.id === videoId ? { ...v, watched: true, progress: percentage } : v
      );
      courseContent.setVideos(updatedVideos);

      // Recalcula o progresso agregado do curso em tempo real. Antes isso só
      // acontecia ao (re)carregar a tela do curso, então o percentual exibido
      // nos cards/lista de cursos ficava defasado até o aluno sair e voltar.
      // Conta todo o conteúdo exceto itens independentes (slides incluídos).
      if (userDetails?.userId) {
        const progressVideos = updatedVideos.filter(
          (v) => v && !v.isIndependent
        );
        updateCourseProgress(userDetails.userId, courseId, progressVideos);
      }
    }
  };

  // Opções do seletor do modal de dúvidas: todo o conteúdo do curso, na ordem
  // em que o aluno o vê. O padrão é o item que ele está assistindo.
  const questionContentOptions = useMemo(
    () =>
      contentItems
        .filter((item) => item && item.id)
        .map((item) => ({ id: item.id, title: item.title })),
    [contentItems]
  );

  const handleAskQuestion = () => {
    if (!userDetails?.userId) {
      auxModals.setShowLogInModal(true);
      return;
    }
    if (videoPlayerRef.current && typeof videoPlayerRef.current.pause === "function") {
      videoPlayerRef.current.pause();
    }
    studentQuestions.setShowQuestionModal(true);
  };

  // Apresentação das dúvidas (professor/admin): leva para a tela única de
  // apresentação, a mesma que o botão "Apresentar" da aba Dúvidas abre. O
  // conteúdo atual vai só como recorte inicial — lá dentro há o seletor.
  const handleOpenQuestions = () => {
    const conteudoAtual = currentVideo?.id || slideNav.slideData?.id;
    if (!courseId) return;

    if (videoPlayerRef.current && typeof videoPlayerRef.current.pause === "function") {
      videoPlayerRef.current.pause();
    }

    const recorte = conteudoAtual ? `videoId=${conteudoAtual}` : "";
    navigate(
      alias
        ? `/cursos/${alias}/questions/apresentar${recorte ? `?${recorte}` : ""}`
        : `/classes/questions/apresentar?courseId=${courseId}${recorte ? `&${recorte}` : ""}`
    );
  };

  const handleOpenQuizGigi = () => quizFlow.handleOpenQuizGigi(slideNav.slideData);

  const handleProgress = (currentTime, duration) => {
    if (userDetails?.userId && currentVideo?.id && courseId) {
      return saveVideoProgress(
        userDetails.userId,
        courseId,
        currentVideo.id,
        currentTime,
        duration
      );
    }
    return { success: false, error: "Parâmetros insuficientes" };
  };

  // Enquanto o acesso não é liberado, não renderiza a sala. Mostra um loader
  // durante a verificação e, para curso fechado, o modal de PIN por cima.
  if (!courseAccess.accessGranted) {
    return (
      <>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
        <style>{`body { background: #F5F5FA }`}</style>
        <Box
          sx={{
            minHeight: "100vh",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#F5F5FA",
          }}
        >
          <Topbar hideSearch={true} />
          <Box
            sx={{
              minHeight: "calc(100vh - 64px)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              px: 2,
              textAlign: "center",
              color: "#888",
            }}
          >
            {courseAccess.accessChecking ? (
              <>
                <Loader />
                <Typography variant="body1">
                  Verificando acesso ao curso...
                </Typography>
              </>
            ) : (
              <Typography variant="body1">
                Este curso requer uma chave de acesso.
              </Typography>
            )}
          </Box>
        </Box>

        <PinAccessModal
          open={courseAccess.showPinModal}
          onClose={courseAccess.handlePinModalClose}
          onSubmit={courseAccess.handlePinAccessGranted}
          selectedCourse={{ courseId }}
        />
      </>
    );
  }

  return (
    <>
      <style>
        {`
                    @media (max-width: 600px) {
                        .Toastify__toast {
                            width: 90vw !important;
                            min-height: auto !important;
                            font-size: 0.9rem !important;
                            padding: 8px 12px !important;
                            margin: 8px auto !important;
                            border-radius: 8px !important;
                            margin-top: 50px !important;
                        }
                        .Toastify__toast-body {
                            margin: 0 !important;
                        }
                    }
                `}
      </style>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        style={{
          width: { xs: "90%", sm: "auto" },
          fontSize: { xs: "0.9rem", sm: "1rem" },
        }}
      />
      <style>
        {`
                    body {
                        background: #F5F5FA
                    }
                `}
      </style>

      <Box
        sx={{
          minHeight: "100vh",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#F5F5FA",
          padding: 0,
          margin: 0,
        }}
      >
        <Topbar hideSearch={true} />
        <Box
          sx={{
            minHeight: "calc(100vh - 64px)",
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            backgroundColor: "#F5F5FA",
            color: "#333",
            pt: { xs: 8, md: 10 },
            pb: { xs: 1, md: 2 },
            px: { xs: 0, md: 2 },
            gap: { xs: 1, md: 2 },
            alignItems: "flex-start",
          }}
        >
          <Box
            ref={contentTopRef}
            sx={{
              flex: { xs: 1, md: 3 },
              display: "flex",
              flexDirection: "column",
              gap: { xs: 1, md: 2 },
              backgroundColor: "#F5F5FA",
              width: "100%",
              marginRight: { md: "16px" },
              // A Topbar é fixa: sem esta margem o scrollIntoView encosta o topo
              // do conteúdo atrás dela.
              scrollMarginTop: { xs: "72px", md: 0 },
            }}
          >
            {quizFlow.showQuiz ? (
              <Quiz
                quizId={`${courseId}/${getQuizResultKey(currentVideoId)}`}
                courseId={courseId}
                currentVideoId={currentVideoId}
                userDetails={userDetails}
                videos={courseContent.videos}
                onComplete={quizFlow.handleQuizComplete}
                onSubmit={quizFlow.handleQuizSubmit}
                onNextVideo={quizFlow.handleNextVideo}
                hasSlide={
                  quizFlow.quizSource === "video" && slideNav.hasQuizSlide(currentVideoId)
                }
                onOpenSlide={() => slideNav.handleOpenSlide(null, currentVideoId)}
                isSlideQuiz={quizFlow.quizSource === "slide"}
                attemptsUsed={
                  userAttempts[getQuizResultKey(currentVideoId)]?.attemptCount || 0
                }
                showResultAfterCompletion={
                  advancedSettingsPanel.advancedSettings.quiz.showResultAfterCompletion
                }
              />
            ) : courseContent.loadingVideos ? (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  p: { xs: 2, sm: 5 },
                  height: { xs: "200px", sm: "400px" },
                  backgroundColor: "#F5F5FA",
                }}
              >
                <Loader />
                <Typography variant="body1" sx={{ ml: 2, color: "#888" }}>
                  Carregando vídeos...
                </Typography>
              </Box>
            ) : currentVideo ? (
              <Box
                sx={{
                  backgroundColor: "#F5F5FA",
                  width: "100%",
                  position: "relative",
                }}
              >
                {slideNav.shouldShowSlidePlayer && slideNav.activeSlide ? (
                  <SlidePlayer
                    slideData={slideNav.activeSlide}
                    onReturnToVideo={slideNav.handleReturnToVideo}
                    courseTitle={courseContent.courseTitle}
                    courseId={courseId}
                    courseOwnerUid={courseContent.courseOwnerUid}
                    onOpenQuizGigi={handleOpenQuizGigi}
                    onAskQuestion={handleAskQuestion}
                    onOpenQuestions={handleOpenQuestions}
                  />
                ) : (
                  <VideoPlayer
                    ref={videoPlayerRef}
                    video={{
                      ...currentVideo,
                      title: `${courseContent.courseTitle} - ${currentVideo.title}`,
                      advancedSettings: advancedSettingsPanel.advancedSettings, // Adicione esta linha
                    }}
                    courseId={courseId}
                    onProgress={handleProgress}
                    videos={contentItems}
                    onVideoChange={handleVideoSelect}
                    setShowQuiz={(videoId) => quizFlow.handleShowQuiz(videoId, "video")}
                    setCurrentVideoId={setCurrentVideoId}
                    onVideoProgressUpdate={handleVideoProgressUpdate}
                    courseOwnerUid={courseContent.courseOwnerUid}
                    onOpenQuizGigi={
                      currentVideo?.quizId ? handleOpenQuizGigi : undefined
                    }
                    onAskQuestion={handleAskQuestion}
                    onOpenQuestions={handleOpenQuestions}
                    onShowSlideQuiz={(slideId) =>
                      quizFlow.handleShowQuiz(slideId, "slide")
                    }
                    hasSlide={slideNav.hasSlide(currentVideo?.id)}
                    onOpenSlide={slideNav.handleOpenSlide}
                  />
                )}
                {/* Prazo do quiz do item em tela, junto do player: é para
                    onde o aluno está olhando enquanto assiste. */}
                {playerQuizItem?.quizId && !playerQuizItem.quizPassed && (
                  <Box sx={{ px: { xs: 1, sm: 2 }, pt: 1 }}>
                    <QuizDeadlineChip
                      quizConfig={quizSettings[getQuizKey(playerQuizItem.quizId)]}
                    />
                  </Box>
                )}
              </Box>
            ) : (
              <Box
                sx={{
                  p: { xs: 2, sm: 5 },
                  textAlign: "center",
                  backgroundColor: "#F5F5FA",
                }}
              >
                <Typography variant="h6" sx={{ color: "#888" }}>
                  Nenhum vídeo disponível.
                </Typography>
              </Box>
            )}
          </Box>
          <Box
            sx={{
              flex: { xs: 1, md: 2 },
              // "auto" no mobile deixava essa coluna crescer com a lista
              // inteira de conteúdos, sem limite — a lista virava a página
              // toda em vez de rolar dentro do próprio espaço.
              height: { xs: "60vh", md: "calc(100vh - 100px)" },
              minWidth: { md: "320px" },
              width: "100%",
            }}
          >
            <Box
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                backgroundColor: "#F5F5FA",
                borderRadius: "16px",
                overflow: "hidden",
                border: "1px solid #e0e0e0",
              }}
            >
              <Tabs
                value={selectedTab}
                onChange={(e, newValue) => setSelectedTab(newValue)}
                textColor="inherit"
                indicatorColor="primary"
                variant="fullWidth"
                sx={{
                  "& .MuiTab-root": {
                    color: "#666",
                    "&.Mui-selected": { color: "#9041c1" },
                  },
                  "& .MuiTabs-indicator": { backgroundColor: "#9041c1" },
                }}
              >
                <Tab label="Conteúdo" />
                <Tab label="Materiais Extras" />
                <Tab label="Trabalhos" />
              </Tabs>
              <Divider />
              <Box
                sx={{
                  flex: 1,
                  overflowY: "auto",
                  p: { xs: 1, sm: 2 },
                  backgroundColor: "#F5F5FA",
                }}
              >
                {selectedTab === 0 ? (
                  <VideoList
                    videos={contentItems}
                    setCurrentVideo={handleVideoSelect}
                    onQuizStart={quizFlow.handleQuizStart}
                    onReviewQuiz={quizFlow.handleReviewQuiz}
                    currentVideoId={currentVideoId}
                    userQuizAttempts={userAttempts}
                    quizSettings={quizSettings}
                    advancedSettings={advancedSettingsPanel.advancedSettings} // Adicione esta linha
                  />
                ) : selectedTab === 1 ? (
                  <MaterialExtra courseId={courseId} />
                ) : userDetails?.userId ? (
                  <AssignmentList courseId={courseId} userId={userDetails.userId} />
                ) : (
                  <Box sx={{ p: 2, textAlign: "center", color: "#888" }}>
                    <Typography variant="body2">
                      Faça login para ver os trabalhos deste curso.
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        </Box>

        <LoginModal
          open={auxModals.showLogInModal}
          onClose={() => auxModals.setShowLogInModal(false)}
          modalRef={auxModals.modalRef}
        />

        {/* <CompletionModal
          open={showCompletionModal}
          onClose={() => setShowCompletionModal(false)}
          onExplore={() => {
            setShowCompletionModal(false);
            navigate("/cursos");
          }}
          modalRef={modalRef}
          modalDimensions={modalDimensions}
          userName={userDetails?.firstName}
          courseTitle={courseTitle}
        /> */}

        <Dialog
          open={Boolean(quizGate.pendingQuizStart)}
          onClose={() => quizGate.setPendingQuizStart(null)}
          aria-labelledby="confirmar-inicio-quiz"
        >
          <DialogTitle id="confirmar-inicio-quiz" sx={{ fontWeight: 600 }}>
            Este quiz tem tentativas limitadas
          </DialogTitle>
          <DialogContent>
            <DialogContentText component="div">
              {quizGate.pendingQuizStart?.attemptLimit === 1
                ? "Você tem apenas 1 tentativa neste quiz."
                : `Você tem ${quizGate.pendingQuizStart?.attemptLimit} tentativas neste quiz e já usou ${quizGate.pendingQuizStart?.attemptsUsed}.`}
              <Box sx={{ mt: 1.5 }}>
                A tentativa só é contada quando você <strong>envia</strong> as
                respostas. Sair antes disso não consome nada.
              </Box>
              {quizGate.pendingQuizStart?.closeDate && (
                <Box sx={{ mt: 1.5, color: "#9041c1", fontWeight: 500 }}>
                  Encerra {formatTimeRemaining(quizGate.pendingQuizStart.closeDate)} ·{" "}
                  {formatQuizDate(quizGate.pendingQuizStart.closeDate)}
                </Box>
              )}
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => quizGate.setPendingQuizStart(null)}
              sx={{ color: "#666", textTransform: "none" }}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                const { start } = quizGate.pendingQuizStart || {};
                quizGate.setPendingQuizStart(null);
                start?.();
              }}
              sx={{
                backgroundColor: "#9041c1",
                borderRadius: "12px",
                "&:hover": { backgroundColor: "#7d37a7" },
                textTransform: "none",
              }}
            >
              Começar quiz
            </Button>
          </DialogActions>
        </Dialog>

        <QuizAnswersReview
          open={Boolean(quizFlow.reviewingQuiz)}
          onClose={() => quizFlow.setReviewingQuiz(null)}
          quizId={quizFlow.reviewingQuiz?.quizId}
          detailedAnswers={userAttempts[quizFlow.reviewingQuiz?.quizKey]?.detailedAnswers}
          canRetryQuiz={
            !hasUserReachedQuizAttemptLimit(
              userAttempts,
              quizFlow.reviewingQuiz?.quizKey,
              getQuizAttemptLimit(quizSettings[quizFlow.reviewingQuiz?.quizKey])
            )
          }
          fullScreen={isMobileLayout}
        />

        <QuestionFormModal
          open={studentQuestions.showQuestionModal}
          onClose={() => studentQuestions.setShowQuestionModal(false)}
          courseId={courseId}
          courseTitle={courseContent.courseTitle}
          contentItems={questionContentOptions}
          defaultContentId={currentVideo?.id || slideNav.slideData?.id || ""}
          userDetails={userDetails}
        />

        {quizFlow.showQuizGigi && (
          <QuizGigi
            onClose={() => quizFlow.setShowQuizGigi(false)}
            quizData={quizFlow.quizData}
            courseId={courseId}
          />
        )}

        {/* Quando abrir o modal de configurações avançadas: */}
        {advancedSettingsPanel.openAdvancedSettings && (
          <AdvancedSettingsModal
            open={advancedSettingsPanel.openAdvancedSettings}
            onClose={() => advancedSettingsPanel.setOpenAdvancedSettings(false)}
            courseId={courseId}
            onSave={(newSettings) => {
              advancedSettingsPanel.setAdvancedSettings(newSettings);
            }}
          />
        )}
      </Box>
    </>
  );
};

export default Classes;
