import { useState } from "react";
import { toast } from "react-toastify";
import { fetchCourseQuizzes } from "$api/services/courses/quizFetch";
import { saveAllCourseQuizzes } from "$api/services/courses/quizCrud";
import { normalizeDiagnosticFlag } from "$api/services/courses/quizWindow";

/**
 * Catálogo de quizzes do curso (vídeo + slide), e as operações expostas ao
 * componente pai (`adminCourse/index.jsx`) via `useImperativeHandle` para o
 * fluxo de duplicar/criar curso.
 */
export function useQuizCatalog(courseId) {
  const [quizzes, setQuizzes] = useState([]);
  const [slideQuizzes, setSlideQuizzes] = useState([]);

  // Função para carregar quizzes (adaptada para vídeos e slides)
  const loadQuizzes = async () => {
    try {
      if (courseId) {
        const quizzesData = await fetchCourseQuizzes(courseId);

        if (!quizzesData) {
          setQuizzes([]);
          setSlideQuizzes([]);
          return;
        }

        // Separar quizzes de vídeos e slides
        const videoQuizzesArray = [];
        const slideQuizzesArray = [];

        Object.entries(quizzesData).forEach(([id, quiz]) => {
          const quizObject = {
            ...quiz,
            videoId: id,
            questions: quiz.questions || [],
            isDiagnostic: normalizeDiagnosticFlag(quiz.isDiagnostic),
            isSlideQuiz: id.startsWith("slide_"),
          };

          if (id.startsWith("slide_")) {
            // Remove 'slide_' prefix para obter o ID real do slide
            quizObject.slideId = id.replace("slide_", "");
            slideQuizzesArray.push(quizObject);
          } else {
            videoQuizzesArray.push(quizObject);
          }
        });

        setQuizzes(videoQuizzesArray);
        setSlideQuizzes(slideQuizzesArray);
      }
    } catch (error) {
      console.error("Erro ao carregar quizzes:", error);
      toast.error("Erro ao buscar quizzes do curso");
      setQuizzes([]);
      setSlideQuizzes([]);
    }
  };

  // Função para salvar os quizzes (adaptada para vídeos e slides)
  const saveQuizzes = async (newCourseId = null) => {
    try {
      // Combine both quiz arrays for saving
      const allQuizzes = [...quizzes, ...slideQuizzes];
      await saveAllCourseQuizzes(courseId, allQuizzes, newCourseId);
      return true;
    } catch (error) {
      console.error("Erro ao salvar quizzes:", error);
      throw error;
    }
  };

  const getQuizzes = () => {
    return [...quizzes, ...slideQuizzes];
  };

  return {
    quizzes,
    setQuizzes,
    slideQuizzes,
    setSlideQuizzes,
    loadQuizzes,
    saveQuizzes,
    getQuizzes,
  };
}
