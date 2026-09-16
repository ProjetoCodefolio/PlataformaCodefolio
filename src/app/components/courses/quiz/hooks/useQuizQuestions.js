import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { fetchQuizQuestions } from "$api/services/courses/quizFetch";
import {
  normalizeAllowRetry,
  normalizeMaxAttempts,
} from "$api/services/courses/quizWindow";

/**
 * Carrega as questões e a configuração do quiz (na montagem e no refazer).
 *
 * A checagem de dados ausentes é mais rígida no refazer (`isRetry: true`):
 * sem isso, um quiz que já estava na tela continuaria mostrando as questões
 * antigas se o recarregamento falhasse.
 */
export function useQuizQuestions(quizId) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quizAllowRetry, setQuizAllowRetry] = useState(true);
  const [quizMaxAttempts, setQuizMaxAttempts] = useState(null);
  const [quizMinPercentage, setQuizMinPercentage] = useState(70);

  const load = useCallback(
    async ({ isRetry = false } = {}) => {
      try {
        setLoading(true);
        const quizData = await fetchQuizQuestions(quizId);

        if (isRetry ? !quizData || !quizData.questions : !quizData) {
          toast.error(
            isRetry
              ? "Erro ao recarregar o quiz."
              : "Erro ao carregar o quiz. Dados não encontrados."
          );
          return;
        }

        setQuestions(quizData.questions || []);
        setQuizAllowRetry(normalizeAllowRetry(quizData.allowRetry));
        setQuizMaxAttempts(normalizeMaxAttempts(quizData.maxAttempts));

        if (
          quizData.minPercentage !== undefined &&
          !isNaN(Number(quizData.minPercentage))
        ) {
          setQuizMinPercentage(Number(quizData.minPercentage));
        } else {
          setQuizMinPercentage(70);
        }
      } catch (error) {
        console.error(
          isRetry ? "Erro ao recarregar quiz:" : "Erro ao carregar quiz:",
          error
        );
        toast.error(
          isRetry
            ? "Não foi possível recarregar o quiz."
            : "Erro ao carregar o quiz. Tente novamente mais tarde."
        );
      } finally {
        setLoading(false);
      }
    },
    [quizId]
  );

  useEffect(() => {
    load();
  }, [load]);

  return {
    questions,
    loading,
    quizAllowRetry,
    quizMaxAttempts,
    quizMinPercentage,
    reload: load,
  };
}
