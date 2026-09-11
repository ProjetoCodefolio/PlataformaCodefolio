import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { fetchAggregatedQuizGrades } from "$api/services/courses/quizAggregation";

/**
 * Carrega as notas agregadas de quizzes de todos os estudantes do curso.
 * `reload` relê tudo do banco SEM acionar o loader de página inteira (usado
 * após devolver uma tentativa — só a carga inicial mostra o loader).
 */
export function useQuizGradesData({ courseId }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const fetchData = async () => {
    if (!courseId) {
      toast.error("ID do curso não fornecido");
      return null;
    }

    try {
      const result = await fetchAggregatedQuizGrades(courseId);
      setData(result);
      return result;
    } catch (error) {
      console.error("Erro ao carregar notas:", error);
      toast.error("Erro ao carregar notas dos quizzes");
      return null;
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [courseId]);

  return { loading, data, setData, reload: fetchData };
}
