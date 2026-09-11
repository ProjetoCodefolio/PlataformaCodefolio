import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { canRunCourse } from "$api/utils/permissions";
import { saveVideoProgress, fetchVideoProgress } from "$api/services/courses/videoProgress";
import { fetchCourseQuizzes } from "$api/services/courses/quizFetch";
import { loadCourseContentForStudent } from "$api/services/courses/content";
import {
  loadCourseData,
  saveVideoProgressWithUrgency,
  checkCourseCompletion,
  loadCourseSlides,
  recoverUnsavedProgress,
} from "$api/services/courses/classes";
import { updateCourseProgress } from "$api/services/courses/students";
import { checkSlideHasQuiz } from "$api/services/courses/slides";
import { loadFlippedClassroomForStudent } from "$api/services/courses/submissions";

/**
 * Carregamento de conteúdo do curso (vídeos novos + legado + slides +
 * entregas de sala invertida), progresso e salvamento automático. É o maior
 * bloco de efeitos do componente — mexe em progresso/Firestore/autosave, e
 * só roda depois que `accessGranted` libera a sala (`useCourseAccess`).
 *
 * `currentVideoId`/`setCurrentVideoId`, `userAttempts`/`setUserAttempts`,
 * `quizSettings`/`setQuizSettings`, `setShowCompletionModal` e `videoPlayerRef`
 * são estado/refs cross-cutting que continuam em `Classes` — chegam aqui por
 * parâmetro para não duplicar fonte de verdade com o domínio de quiz.
 *
 * Recebe só `currentVideoId` (não o `currentVideo` já resolvido com o
 * cruzamento de dados de quiz, que depende de `videos` — o próprio estado
 * deste hook): os efeitos daqui só precisam do `.id`, então derivam seu
 * próprio `currentVideo` localmente a partir do `videos` que já possuem.
 */
export function useCourseContent({
  courseId,
  userDetails,
  accessGranted,
  currentVideoId,
  setCurrentVideoId,
  videoPlayerRef,
  setUserAttempts,
  setQuizSettings,
  setShowCompletionModal,
  navigate,
}) {
  const [videos, setVideos] = useState([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [courseTitle, setCourseTitle] = useState("");
  const [courseOwnerUid, setCourseOwnerUid] = useState("");
  const [slides, setSlides] = useState([]);

  const currentVideo = videos.find((video) => video.id === currentVideoId);

  // Seleciona um vídeo padrão assim que a lista carrega, se nada foi escolhido.
  useEffect(() => {
    if (!currentVideoId && videos.length > 0) {
      setCurrentVideoId(videos[0].id);
    }
  }, [videos, currentVideoId]);

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

        // Curso arquivado só pode ser acessado pelo owner, admin ou professor
        // da turma. Qualquer outra pessoa (inclusive via link/alias direto ou
        // aluno já matriculado) é bloqueada.
        const canAccessArchived = canRunCourse(
          userDetails,
          courseData.courseOwnerUid,
          courseId
        );
        if (courseData?.courseData?.archived && !canAccessArchived) {
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

        // Um `?videoId=` inexistente (link antigo, conteúdo excluído) não pode
        // deixar a sala presa numa tela vazia: nesse caso vale a escolha padrão.
        const idAtualValido =
          currentVideoId &&
          combinedContent.some((item) => item?.id === currentVideoId);

        if (!idAtualValido) {
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

  return {
    videos,
    setVideos,
    loadingVideos,
    courseTitle,
    courseOwnerUid,
    slides,
  };
}
