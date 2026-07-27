import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { VideoPlayer } from "$components/courses/videoPlayerClasses";
import VideoList from "$components/courses/videoList";
import MaterialExtra from "$components/courses/extraMaterials";
import Quiz from "$components/courses/quiz";
import {
  Box,
  Tabs,
  Tab,
  Typography,
  CircularProgress,
  Divider,
  Button,
  Modal,
  Grid,
  Card,
  CardContent,
  CardActions,
} from "@mui/material";
import Topbar from "$components/topbar/Topbar";
import { useAuth } from "$context/AuthContext";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import LoginModal from "$components/modals/LoginModal";
import CompletionModal from "$components/modals/CompletionModal";
import QuizGigi from "$components/courses/quizGigi";
import SlidePlayer from "$components/courses/slidePlayer";
import { validateQuizAnswers } from "$api/services/courses/quizzes";
import { saveVideoProgress, fetchVideoProgress } from "$api/services/courses/videoProgress";
import {
  fetchCourseQuizzes,
  fetchUserQuizResults,
  getQuizAttemptLimit,
  hasUserReachedQuizAttemptLimit,
} from "$api/services/courses/quizzes";
import { loadCourseContentForStudent } from "$api/services/courses/content";
import {
  loadCourseData,
  saveVideoProgressWithUrgency,
  processQuizCompletion,
  checkCourseCompletion,
  loadCourseSlides,
  loadQuizData,
  recoverUnsavedProgress,
} from "$api/services/courses/classes";
import { getCourseIdByAlias } from "$api/services/courses/alias";
import {
  fetchCourseDetails,
  checkStudentCourseEnrollment,
} from "$api/services/courses/courses";
import PinAccessModal from "$components/modals/PinAccessModal";
import { updateCourseProgress } from "$api/services/courses/students";
import { checkSlideHasQuiz } from "$api/services/courses/slides";
import SlideshowIcon from "@mui/icons-material/Slideshow";
import { fetchAdvancedSettings } from "$api/services/courses/advancedSettings";
import AdvancedSettingsModal from "$components/courses/AdvancedSettingsModal";
import { loadFlippedClassroomForStudent } from "$api/services/courses/submissions";
import AssignmentList from "$components/courses/assignments/AssignmentList";

const Classes = ({ alias = null }) => {
  const [videos, setVideos] = useState([]);
  const [currentVideoId, setCurrentVideoId] = useState(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [courseTitle, setCourseTitle] = useState("");
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showLogInModal, setShowLogInModal] = useState(false);
  const { userDetails } = useAuth();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const [courseId, setCourseId] = useState(params.get("courseId"));
  const videoPlayerRef = useRef({
    pause: () => { },
    getCurrentTime: () => 0,
    getDuration: () => 0,
    seekTo: () => { },
  });
  const [loadingVideos, setLoadingVideos] = useState(false);
  // Controle de acesso ao curso (fonte única de verdade da sala de aula).
  // - accessChecking: ainda decidindo se o aluno pode entrar (mostra loader).
  // - accessGranted: liberado a ver o conteúdo (curso aberto, dono/admin,
  //   aluno já matriculado ou PIN validado).
  // - showPinModal: curso fechado e o aluno precisa informar o PIN.
  const [accessChecking, setAccessChecking] = useState(true);
  const [accessGranted, setAccessGranted] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  // Evita que o onClose do PinAccessModal (chamado também após um envio válido)
  // redirecione o aluno recém-liberado para fora da sala.
  const accessGrantedRef = useRef(false);
  const navigate = useNavigate();
  const modalRef = useRef(null);
  const [modalDimensions, setModalDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [showQuizGigi, setShowQuizGigi] = useState(false);
  const [quizData, setQuizData] = useState(null);
  const [courseOwnerUid, setCourseOwnerUid] = useState("");
  const [showSlidePlayer, setShowSlidePlayer] = useState(false);
  const [slideData, setSlideData] = useState(null);
  const [videoIdBeforeSlide, setVideoIdBeforeSlide] = useState(null);
  const [videoSlides, setVideoSlides] = useState({});
  const [userAttempts, setUserAttempts] = useState({});
  // Configuração de tentativas por quiz (allowRetry/maxAttempts), chaveada pelo
  // id do conteúdo (mesma chave usada em userAttempts e em video.quizId).
  const [quizSettings, setQuizSettings] = useState({});
  const [slides, setSlides] = useState([]); // Novo estado para armazenar slides independentes
  // Adicionar uma verificação para determinar se o quiz é de vídeo ou slide
  const [quizSource, setQuizSource] = useState("video"); // Pode ser "video" ou "slide"

  // Adicione um estado para armazenar as configurações avançadas
  const [advancedSettings, setAdvancedSettings] = useState({
    videos: { requirePreviousCompletion: true },
    quiz: { allowRetry: true, showResultAfterCompletion: true },
  });
  const [openAdvancedSettings, setOpenAdvancedSettings] = useState(false);

  const currentVideo = videos.find((video) => video.id === currentVideoId);
  const activeSlide =
    slideData || (currentVideo?.isSlide ? currentVideo : null);
  const shouldShowSlidePlayer = showSlidePlayer || Boolean(activeSlide);

  useEffect(() => {
    if (!currentVideoId && videos.length > 0) {
      setCurrentVideoId(videos[0].id);
    }
  }, [videos, currentVideoId]);

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

  useEffect(() => {
    if (showCompletionModal && modalRef.current) {
      const { offsetWidth, offsetHeight } = modalRef.current;
      setModalDimensions({ width: offsetWidth, height: offsetHeight });
    }

    if (showLogInModal && modalRef.current) {
      const { offsetWidth, offsetHeight } = modalRef.current;
      setModalDimensions({ width: offsetWidth, height: offsetHeight });
    }
  }, [showCompletionModal, showLogInModal]);

  useEffect(() => {
    if (alias) {
      const courseIdFromAlias = async () => {
        try {
          const result = await getCourseIdByAlias(alias);
          if (result.courseId) {
            setCourseId(result.courseId);
          } else {
            toast.error("Curso não encontrado para o alias fornecido.");
            navigate("/404");
          }
        } catch (error) {
          console.error("Erro ao obter ID do curso por alias:", error);
          toast.error("Houve um erro ao carregar o curso. Por favor, tente novamente.");
          navigate("/404");
        }
      };
      courseIdFromAlias();
    }

  }, [alias, navigate]);

  // Controle de acesso (fonte única): decide se o aluno pode entrar na sala,
  // independentemente de como chegou aqui (link/alias direto, ?courseId= ou
  // pelas telas de listagem). Regras:
  //   - Curso aberto (sem pinEnabled): acesso livre, sem controle.
  //   - Curso fechado: dono/admin e alunos JÁ matriculados entram direto;
  //     integrantes novos precisam informar o PIN (PinAccessModal).
  // A verificação roda ANTES do carregamento do conteúdo, para que o progresso
  // (que cria o vínculo em studentCourses) nunca seja gravado sem liberação.
  useEffect(() => {
    if (!courseId) return;

    let cancelled = false;

    const resolveAccess = async () => {
      setAccessChecking(true);
      accessGrantedRef.current = false;
      try {
        const course = await fetchCourseDetails(courseId);
        if (cancelled) return;

        const grant = () => {
          accessGrantedRef.current = true;
          setAccessGranted(true);
          setShowPinModal(false);
        };

        // Curso aberto: nenhum controle de acesso.
        if (!course?.pinEnabled) {
          grant();
          return;
        }

        // Dono do curso ou admin nunca precisam do PIN.
        const isOwner = course?.userId && course.userId === userDetails?.userId;
        const isAdmin = userDetails?.role === "admin";
        if (isOwner || isAdmin) {
          grant();
          return;
        }

        // Já ingressou antes: acessa normalmente, sem pedir o PIN de novo.
        let alreadyEnrolled = false;
        if (userDetails?.userId) {
          alreadyEnrolled = await checkStudentCourseEnrollment(
            userDetails.userId,
            courseId
          );
        }
        if (cancelled) return;

        if (alreadyEnrolled) {
          grant();
          return;
        }

        // Integrante novo em curso fechado: exige o PIN.
        setAccessGranted(false);
        setShowPinModal(true);
      } catch (error) {
        console.error("Erro ao verificar acesso ao curso:", error);
        // Em caso de falha na verificação, não libera o acesso.
        setAccessGranted(false);
        setShowPinModal(false);
        toast.error("Não foi possível verificar o acesso ao curso.");
      } finally {
        if (!cancelled) setAccessChecking(false);
      }
    };

    resolveAccess();

    return () => {
      cancelled = true;
    };
  }, [courseId, userDetails?.userId, userDetails?.role]);

  // PIN validado com sucesso: libera a sala. O vínculo em studentCourses é
  // criado naturalmente ao gravar o progresso no carregamento do conteúdo, então
  // em acessos futuros o aluno cai na regra "já matriculado" e não vê mais o PIN.
  const handlePinAccessGranted = () => {
    accessGrantedRef.current = true;
    setShowPinModal(false);
    setAccessGranted(true);
  };

  // Modal fechado. Se foi por um PIN válido, o acesso já foi liberado; caso
  // contrário (backdrop/ESC sem PIN), o aluno não entra e volta para a lista.
  const handlePinModalClose = () => {
    setShowPinModal(false);
    if (!accessGrantedRef.current) {
      navigate("/cursos");
    }
  };

  // Carrega os dados iniciais do curso
  useEffect(() => {
    const fetchData = async () => {
      setLoadingVideos(true);
      try {
        // Carrega dados do curso usando o serviço
        const courseData = await loadCourseData(
          courseId,
          userDetails,
          currentVideoId
        );

        // Curso arquivado só pode ser acessado pelo owner (ou por um admin).
        // Qualquer outra pessoa (inclusive via link/alias direto ou aluno já
        // matriculado) é bloqueada.
        const isOwner = courseData.courseOwnerUid === userDetails?.userId;
        const isAdmin = userDetails?.role === "admin";
        if (courseData?.courseData?.archived && !isOwner && !isAdmin) {
          toast.error("Este curso está arquivado e não está disponível.");
          navigate("/cursos");
          return;
        }

        // Carregar conteúdo da nova collection unificada (courseContent).
        // Convive com o formato legado (courseVideos/courseSlides) até a
        // migração completa — o aluno vê os dois, intercalados pela ordem global.
        const contentItems = await loadCourseContentForStudent(courseId, {
          fetchVideoProgress,
          userId: userDetails?.userId,
          userQuizzesResults: courseData.userQuizzesResults,
        });

        // Carregar slides independentes (formato legado)
        const slidesData = await loadCourseSlides(courseId);

        // Formatar cada slide para aparecer como um item na lista de conteúdo.
        // A ordem (`order`) é compartilhada globalmente com os vídeos, então
        // slides e vídeos são intercalados pela ordem definida na aba "Conteúdo".
        const formattedSlides = await Promise.all(
          slidesData.map(async (slide, index) => {
            // Verificar se este slide tem quiz associado
            const hasQuiz = await checkSlideHasQuiz(courseId, slide.id);

            return {
              ...slide,
              id: slide.id,
              isSlide: true,
              type: "slide",
              title: slide.title,
              description: slide.description || "",
              url: slide.url,
              watched: true,
              progress: 100, // Slides são sempre considerados 100% vistos
              // Slides legados (sem `order`) recebem um valor alto para aparecer
              // após os vídeos, preservando o comportamento anterior.
              order: typeof slide.order === "number" ? slide.order : 1000 + index,
              quizId: hasQuiz ? `${courseId}/slide_${slide.id}` : null,
              // Resultado do quiz do slide legado (chaveado por `slide_<id>`).
              // Necessário porque slides agora contam no progresso: sem isto, um
              // slide legado com quiz nunca seria considerado concluído.
              quizPassed: hasQuiz
                ? courseData.userQuizzesResults?.[`slide_${slide.id}`]?.isPassed ||
                  courseData.userQuizzesResults?.[`slide_${slide.id}`]?.passed ||
                  false
                : false,
            };
          })
        );

        // Carregar vídeos entregues no modelo "sala de aula invertida".
        // Agora são conteúdo de primeira classe: respeitam a ordem definida pelo
        // professor, CONTAM no progresso (não são mais isIndependent) e podem ter
        // quiz. Ficam armazenados nas entregas dos alunos (assignmentSubmissions).
        const formattedFlipped = await loadFlippedClassroomForStudent(courseId, {
          fetchVideoProgress,
          userId: userDetails?.userId,
          userQuizzesResults: courseData.userQuizzesResults,
        });

        // Combinar todo o conteúdo (novo, legado, slides e vídeos de entrega),
        // ordenando pela ordem global. Todos compartilham a mesma sequência e são
        // intercalados conforme a ordem definida pelo professor; itens sem ordem
        // definida (ex.: entregas recém-enviadas) caem no fim.
        const combinedContent = [
          ...contentItems,
          ...courseData.videos,
          ...formattedSlides,
          ...formattedFlipped,
        ].sort((a, b) => {
          const orderA = typeof a?.order === "number" ? a.order : Number.POSITIVE_INFINITY;
          const orderB = typeof b?.order === "number" ? b.order : Number.POSITIVE_INFINITY;
          if (orderA !== orderB) return orderA - orderB;
          // Desempate estável: vídeos antes de slides, depois por id.
          if (!!a?.isSlide !== !!b?.isSlide) return a?.isSlide ? 1 : -1;
          return String(a?.id).localeCompare(String(b?.id));
        });

        setCourseTitle(courseData.courseTitle);
        setCourseOwnerUid(courseData.courseOwnerUid);
        setVideos(combinedContent);

        // Recalcula o progresso do curso com a lista completa: todo o conteúdo
        // (vídeos novos/legados/entrega + slides), exceto itens independentes.
        // Um item só conta como concluído se assistido e, havendo quiz, aprovado
        // (a lógica fica em updateCourseProgress).
        //
        // Só persiste se a leitura do progresso foi CONFIÁVEL: se a busca do
        // progresso de qualquer item falhou (progressError), aquele item vem com
        // watched:false falso-negativo — persistir aqui gravaria um percentual
        // rebaixado (e poderia virar completed→in_progress). Neste caso pulamos a
        // gravação; o valor é reconciliado no próximo carregamento bem-sucedido.
        if (userDetails?.userId) {
          const progressVideos = combinedContent.filter(
            (v) => v && !v.isIndependent
          );
          const progressReliable = combinedContent.every(
            (v) => !v?.progressError
          );
          if (progressReliable) {
            updateCourseProgress(userDetails.userId, courseId, progressVideos);
          }
        }
        setUserAttempts(courseData.userQuizzesResults);

        // Carrega a configuração de tentativas de cada quiz do curso (usada para
        // bloquear o início/repetição de quizzes que atingiram o limite).
        try {
          const quizzesMap = await fetchCourseQuizzes(courseId);
          setQuizSettings(quizzesMap || {});
        } catch (quizSettingsError) {
          console.error(
            "Erro ao carregar configurações de tentativas dos quizzes:",
            quizSettingsError
          );
        }

        if (!currentVideoId) {
          // O item inicial deve respeitar a ORDEM GLOBAL da lista combinada
          // (conteúdo novo + legado), e não o `nextVideoId` calculado só com os
          // vídeos legados — senão o aluno abre no vídeo que "antigamente" era o
          // primeiro, ignorando a reordenação. Escolhe o primeiro item ainda não
          // concluído; se todos estiverem concluídos, o primeiro da lista.
          const firstUnfinished = combinedContent.find(
            (item) =>
              item &&
              !item.isIndependent &&
              (!item.watched || (item.quizId && !item.quizPassed))
          );
          setCurrentVideoId(
            firstUnfinished?.id || combinedContent[0]?.id || null
          );
        }
      } catch (error) {
        console.error("Erro ao carregar dados do curso:", error);
        toast.error(
          "Houve um erro ao carregar o curso. Por favor, tente novamente."
        );
      } finally {
        setLoadingVideos(false);
      }
    };

    // Só carrega o conteúdo (e grava progresso) após o acesso ser liberado.
    if (courseId && accessGranted) {
      fetchData();
    }
  }, [courseId, userDetails?.userId, accessGranted]);

  // Recupera progresso não salvo da sessão anterior
  useEffect(() => {
    if (courseId && userDetails?.userId && accessGranted) {
      recoverUnsavedProgress(courseId, userDetails?.userId);
    }
  }, [courseId, userDetails?.userId, accessGranted]);

  // Salva progresso ao fechar a página
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (videoPlayerRef.current && currentVideo && userDetails?.userId) {
        const currentTime = videoPlayerRef.current.getCurrentTime() || 0;
        const duration = videoPlayerRef.current.getDuration() || 0;

        if (currentTime > 0 && duration > 0) {
          // Salvar com urgência
          saveVideoProgressWithUrgency({
            userId: userDetails.userId,
            courseId,
            videoId: currentVideo.id,
            currentTime,
            duration,
            urgent: true,
          });

          event.preventDefault();
          event.returnValue = "";
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [currentVideo, userDetails?.userId, courseId]);

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

  // Salvamento automático de progresso
  useEffect(() => {
    if (
      !videoPlayerRef.current ||
      !currentVideo ||
      !userDetails?.userId ||
      !courseId
    )
      return;

    // Salvar progresso a cada 30 segundos
    const saveInterval = setInterval(() => {
      try {
        const currentTime = videoPlayerRef.current.getCurrentTime?.() || 0;
        const duration = videoPlayerRef.current.getDuration?.() || 0;

        if (currentTime > 0 && duration > 0) {
          saveVideoProgress(
            userDetails.userId,
            courseId,
            currentVideo.id,
            currentTime,
            duration
          );
        }
      } catch (error) {
        console.error("Erro no salvamento automático:", error);
      }
    }, 30000);

    return () => {
      clearInterval(saveInterval);
    };
  }, [videoPlayerRef.current, currentVideo, userDetails?.userId, courseId]);

  // Carrega slides do curso
  useEffect(() => {
    const loadSlides = async () => {
      try {
        if (courseId && accessGranted) {
          const slidesData = await loadCourseSlides(courseId);

          // Verificar quais slides têm quiz associado e adicionar a propriedade quizId
          const slidesWithQuizInfo = await Promise.all(
            slidesData.map(async (slide) => {
              const hasQuiz = await checkSlideHasQuiz(courseId, slide.id);

              if (hasQuiz) {
                // Adiciona o quizId no formato correto
                return {
                  ...slide,
                  quizId: `${courseId}/slide_${slide.id}`,
                };
              }
              return slide;
            })
          );

          setSlides(slidesWithQuizInfo);
        }
      } catch (error) {
        console.error("Erro ao carregar slides:", error);
      }
    };

    loadSlides();
  }, [courseId, accessGranted]);

  // Verifica conclusão do curso quando os vídeos mudam
  useEffect(() => {
    const verifyCourseCompletion = async () => {
      // Vídeos de entrega (sala invertida) agora CONTAM para a conclusão, então
      // não são mais filtrados aqui.
      const isCompleted = await checkCourseCompletion(
        videos,
        userDetails?.userId,
        courseId
      );
      if (isCompleted) {
        setShowCompletionModal(true);
      }
    };

    verifyCourseCompletion();
  }, [videos]);

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

  // Tratamento de erros do player
  useEffect(() => {
    const handlePlayerError = (e) => {
      if (e.message && e.message.includes("Cannot read properties of null")) {
        console.warn(
          "[Classes] Detectado erro de inicialização do YouTube player"
        );
      }
    };

    window.addEventListener("error", handlePlayerError);

    return () => {
      window.removeEventListener("error", handlePlayerError);
    };
  }, []);

  // Manipuladores de eventos

  // Chave do quiz/resultado de um conteúdo: slides LEGADOS usam o prefixo
  // `slide_` (courseQuizzes/{courseId}/slide_{id}); itens da nova collection
  // unificada (mesmo sendo slides) e vídeos usam o id puro.
  const getQuizResultKey = (id) => {
    const item = videos.find((v) => v.id === id);
    return item?.isSlide && !item?.isContentItem ? `slide_${id}` : id;
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

  // Função para navegar para o próximo vídeo
  const handleNextVideo = () => {
    const currentVideoIndex = videos.findIndex((v) => v.id === currentVideoId);
    if (currentVideoIndex < videos.length - 1) {
      const nextVideo = videos[currentVideoIndex + 1];
      setCurrentVideoId(nextVideo.id);
      setShowQuiz(false);
    }
  };

  const handleVideoSelect = (video) => {
    // Se o usuário escolheu outro conteúdo, sair do modo quiz
    setShowQuiz(false);

    // Se for slide ou se a configuração não exigir completar vídeo anterior, permitir acesso direto
    if (
      video.isSlide ||
      advancedSettings?.videos?.requirePreviousCompletion === false
    ) {
      // Guardar o vídeo atual para conseguir voltar ao vídeo após visualizar slide
      if (video.isSlide && currentVideoId && !currentVideo?.isSlide) {
        setVideoIdBeforeSlide(currentVideoId);
      }
      setCurrentVideoId(video.id);
      return;
    }

    // Lógica padrão para verificar bloqueio
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
    } else {
      toast.warning("Você precisa assistir ao vídeo anterior primeiro!");
    }
  };

  const handleQuizStart = (quizId, videoId) => {
    // Bloqueia o início/repetição quando o aluno já esgotou as tentativas
    // configuradas para este quiz (allowRetry=false → 1; ou maxAttempts).
    const quizKey = quizId.includes("/") ? quizId.split("/")[1] : quizId;
    const attemptLimit = getQuizAttemptLimit(quizSettings[quizKey]);
    if (hasUserReachedQuizAttemptLimit(userAttempts, quizId, attemptLimit)) {
      toast.info(
        attemptLimit === 1
          ? "Este quiz permite apenas 1 tentativa, que você já utilizou."
          : `Você já atingiu o limite de ${attemptLimit} tentativas para este quiz.`
      );
      return;
    }

    setCurrentVideoId(videoId);

    // Detectar se é um quiz de slide ou de vídeo
    const isSlideQuiz =
      quizId.includes("slide_") ||
      videos.find((v) => v.id === videoId)?.isSlide;
    setQuizSource(isSlideQuiz ? "slide" : "video");

    setShowQuiz(true);
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

  const handleVideoProgressUpdate = (
    videoId,
    percentage,
    hasReached90Percent
  ) => {
    if (hasReached90Percent) {
      const updatedVideos = videos.map((v) =>
        v.id === videoId ? { ...v, watched: true, progress: percentage } : v
      );
      setVideos(updatedVideos);

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

  // Modificar a função handleOpenSlide para que funcione com slides independentes
  // Também fecha o Quiz, para que o usuário veja o Slide ao abrir.
  const handleOpenSlide = (slideOrContext = null, videoIdArg = null, quizIdArg = null) => {
    if (
      videoPlayerRef.current &&
      typeof videoPlayerRef.current.pause === "function"
    ) {
      videoPlayerRef.current.pause();
    }

    // Ao abrir slides, garantir que saímos do modo quiz
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

  const hasQuizSlide = (quizId) => {
    if (!quizId) return false;
    const quizKey = `quiz_${quizId}`;
    return videoSlides[quizKey] && videoSlides[quizKey].length > 0;
  };

  // Modificar a função que mostra o quiz
  const handleShowQuiz = (videoId, source = "video") => {
    if (typeof videoId === "string") {
      setCurrentVideoId(videoId);
    }
    setQuizSource(source);
    setShowQuiz(true);
  };

  // Função para verificar se um slide possui quiz
  const hasSlideQuiz = async (slideId) => {
    if (!slideId || !courseId) return false;

    try {
      return await checkSlideHasQuiz(courseId, slideId);
    } catch (error) {
      console.error("Erro ao verificar quiz do slide:", error);
      return false;
    }
  };

  // Adicionar esta função de verificação de slides antes do retorno do componente
  const hasSlide = (videoId) => {
    if (!videoId || !slides) return false;

    // Verificar se existe algum slide associado a este videoId
    const slideForVideo = slides.find((slide) => slide.videoId === videoId);
    return !!slideForVideo;
  };

  // Adicione este useEffect para carregar as configurações avançadas
  useEffect(() => {
    const loadAdvancedSettings = async () => {
      try {
        if (courseId) {
          const settings = await fetchAdvancedSettings(courseId);
          setAdvancedSettings(settings);
        }
      } catch (error) {
        console.error("Erro ao carregar configurações avançadas:", error);
      }
    };

    loadAdvancedSettings();
  }, [courseId]);

  // Enquanto o acesso não é liberado, não renderiza a sala. Mostra um loader
  // durante a verificação e, para curso fechado, o modal de PIN por cima.
  if (!accessGranted) {
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
            {accessChecking ? (
              <>
                <CircularProgress color="secondary" />
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
          open={showPinModal}
          onClose={handlePinModalClose}
          onSubmit={handlePinAccessGranted}
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
            sx={{
              flex: { xs: 1, md: 3 },
              display: "flex",
              flexDirection: "column",
              gap: { xs: 1, md: 2 },
              backgroundColor: "#F5F5FA",
              width: "100%",
              marginRight: { md: "16px" },
            }}
          >
            {showQuiz ? (
              <Quiz
                quizId={`${courseId}/${getQuizResultKey(currentVideoId)}`}
                courseId={courseId}
                currentVideoId={currentVideoId}
                userDetails={userDetails}
                videos={videos}
                onComplete={handleQuizComplete}
                onSubmit={handleQuizSubmit}
                onNextVideo={handleNextVideo}
                hasSlide={
                  quizSource === "video" && hasQuizSlide(currentVideoId)
                }
                onOpenSlide={() => handleOpenSlide(null, currentVideoId)}
                isSlideQuiz={quizSource === "slide"}
                attemptsUsed={
                  userAttempts[getQuizResultKey(currentVideoId)]?.attemptCount || 0
                }
                showResultAfterCompletion={
                  advancedSettings.quiz.showResultAfterCompletion
                }
              />
            ) : loadingVideos ? (
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
                <CircularProgress color="secondary" />
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
                {shouldShowSlidePlayer && activeSlide ? (
                  <SlidePlayer
                    slideData={activeSlide}
                    onReturnToVideo={handleReturnToVideo}
                    courseTitle={courseTitle}
                    courseId={courseId}
                    courseOwnerUid={courseOwnerUid}
                    onOpenQuizGigi={handleOpenQuizGigi}
                  />
                ) : (
                  <VideoPlayer
                    ref={videoPlayerRef}
                    video={{
                      ...currentVideo,
                      title: `${courseTitle} - ${currentVideo.title}`,
                      advancedSettings: advancedSettings, // Adicione esta linha
                    }}
                    courseId={courseId}
                    onProgress={handleProgress}
                    videos={videos}
                    onVideoChange={handleVideoSelect}
                    setShowQuiz={(videoId) => handleShowQuiz(videoId, "video")}
                    setCurrentVideoId={setCurrentVideoId}
                    onVideoProgressUpdate={handleVideoProgressUpdate}
                    courseOwnerUid={courseOwnerUid}
                    onOpenQuizGigi={
                      currentVideo?.quizId ? handleOpenQuizGigi : undefined
                    }
                    onShowSlideQuiz={(slideId) =>
                      handleShowQuiz(slideId, "slide")
                    }
                    hasSlide={hasSlide(currentVideo?.id)}
                    onOpenSlide={handleOpenSlide}
                  />
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
              height: { xs: "auto", md: "calc(100vh - 100px)" },
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
                    videos={videos}
                    setCurrentVideo={handleVideoSelect}
                    onQuizStart={handleQuizStart}
                    currentVideoId={currentVideoId}
                    userQuizAttempts={userAttempts}
                    quizSettings={quizSettings}
                    advancedSettings={advancedSettings} // Adicione esta linha
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
          open={showLogInModal}
          onClose={() => setShowLogInModal(false)}
          modalRef={modalRef}
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

        {showQuizGigi && (
          <QuizGigi
            onClose={() => setShowQuizGigi(false)}
            quizData={quizData}
            courseId={courseId}
          />
        )}

        {/* Quando abrir o modal de configurações avançadas: */}
        {openAdvancedSettings && (
          <AdvancedSettingsModal
            open={openAdvancedSettings}
            onClose={() => setOpenAdvancedSettings(false)}
            courseId={courseId}
            onSave={(newSettings) => {
              setAdvancedSettings(newSettings);
            }}
          />
        )}
      </Box>
    </>
  );
};

export default Classes;
