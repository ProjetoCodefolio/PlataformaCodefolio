import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { getCourseIdByAlias } from "$api/services/courses/alias";

/**
 * Resolve o `courseId` da sala: vem direto de `?courseId=` OU, quando a rota
 * é por apelido (`alias`), é buscado de forma assíncrona. `?courseId=`
 * também inicializa o estado diretamente (sem depender deste efeito), por
 * isso `setCourseId` é exposto publicamente.
 */
export function useCourseIdentity({ alias, initialCourseId, navigate }) {
  const [courseId, setCourseId] = useState(initialCourseId);

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

  return { courseId, setCourseId };
}
