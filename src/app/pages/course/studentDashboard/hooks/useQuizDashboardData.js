import { useCallback, useEffect, useState } from "react";
import { fetchQuizData } from "$api/services/courses/studentDashboard";

/**
 * Carrega o quiz, o curso, o vídeo/slide e os resultados dos estudantes
 * (regular + live + custom). `reload({ silent: true })` relê tudo sem
 * acionar o spinner de página inteira — usado depois do recálculo de notas,
 * para o professor não perder o contexto da tela.
 */
export function useQuizDashboardData(quizId) {
  const [quiz, setQuiz] = useState(null);
  const [courseData, setCourseData] = useState(null);
  const [videoData, setVideoData] = useState(null);
  const [studentResults, setStudentResults] = useState([]);
  const [liveQuizResults, setLiveQuizResults] = useState({});
  const [customQuizResults, setCustomQuizResults] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!quizId) {
        setLoading(false);
        return;
      }

      try {
        if (silent) setRefreshing(true);
        else setLoading(true);

        const data = await fetchQuizData(quizId);

        setQuiz(data.quiz);
        setCourseData(data.courseData);
        setVideoData(data.videoData);
        setStudentResults(data.studentResults);
        setLiveQuizResults(data.liveQuizResults);
        setCustomQuizResults(data.customQuizResults);
      } catch (error) {
        console.error("Erro ao carregar dados do quiz:", error);
      } finally {
        setRefreshing(false);
        setLoading(false);
      }
    },
    [quizId]
  );

  useEffect(() => {
    load();
  }, [load]);

  return {
    quiz,
    courseData,
    videoData,
    studentResults,
    liveQuizResults,
    customQuizResults,
    loading,
    refreshing,
    reload: load,
  };
}
