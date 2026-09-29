import { useState } from "react";
import { toast } from "react-toastify";
import { fetchCourseVideosForQuiz } from "$api/services/courses/quizFetch";
import { fetchCourseSlides } from "$api/services/courses/slides";
import { fetchCourseContentItems } from "$api/services/courses/content";
import { fetchFlippedClassroomVideos } from "$api/services/courses/submissions";

/**
 * Alvos de quiz disponíveis (vídeos/conteúdo novo + legado, e slides legados).
 * Ao carregar, autosseleciona o primeiro item nos campos de criação de quiz
 * quando ainda não há nada escolhido — por isso `loadVideos`/`loadSlides`
 * recebem o valor+setter de seleção atuais como argumento (dependência
 * preservada tal como estava no componente original, não redesenhada; só
 * passada na invocação em vez de na criação do hook, para não formar uma
 * dependência circular entre este hook e `useQuizCreationForm`).
 */
export function useQuizContentSources(courseId, initialVideos, initialSlides) {
  const [videosState, setVideos] = useState(initialVideos || []);
  const [slidesState, setSlides] = useState(initialSlides || []);

  // Função para carregar os alvos de quiz da aba "Quizzes de Conteúdo":
  // itens da nova collection unificada (vídeos e slides) + vídeos legados.
  // Ambos usam a mesma chave de quiz (courseQuizzes/{courseId}/{id}, sem prefixo).
  const loadVideos = async (newQuizVideoId, setNewQuizVideoId) => {
    try {
      const [contentData, videosData, flippedData] = await Promise.all([
        fetchCourseContentItems(courseId),
        fetchCourseVideosForQuiz(courseId),
        fetchFlippedClassroomVideos(courseId),
      ]);

      const contentTargets = contentData.map((item) => ({
        id: item.id,
        title:
          item.category === "slide" ? `${item.title} (Slide)` : item.title,
        // O quiz só aparece quando o conteúdo aparece: a tela precisa da data
        // do conteúdo para mostrar a publicação efetiva.
        publishAt: item.publishAt || "",
      }));

      // Vídeos de entrega (sala de aula invertida): quiz chaveado pelo id `flip_...`.
      const flippedTargets = flippedData.map((v) => ({
        id: v.id,
        title: `${v.title} (Entrega)`,
      }));

      const targets = [...contentTargets, ...flippedTargets, ...videosData];
      setVideos(targets);

      if (targets.length > 0 && !newQuizVideoId) {
        setNewQuizVideoId(targets[0].id);
      }
    } catch (error) {
      console.error("Erro ao carregar conteúdo:", error);
      toast.error("Erro ao buscar o conteúdo do curso");
      setVideos([]);
    }
  };

  // Nova função para carregar slides
  const loadSlides = async (newQuizSlideId, setNewQuizSlideId) => {
    try {
      const slidesData = await fetchCourseSlides(courseId);
      setSlides(slidesData);

      if (slidesData && slidesData.length > 0 && !newQuizSlideId) {
        setNewQuizSlideId(slidesData[0].id);
      }
    } catch (error) {
      console.error("Erro ao carregar slides:", error);
      toast.error("Erro ao buscar slides do curso");
      setSlides([]);
    }
  };

  return { videosState, setVideos, slidesState, setSlides, loadVideos, loadSlides };
}
