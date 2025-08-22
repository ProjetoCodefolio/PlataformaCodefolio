import { loadCategorizedCourses, filterCoursesBySearchTerm } from "./courses";

/**
 * Carrega todos os cursos categorizados e filtrados por termo de pesquisa
 * @param {string} userId - ID do usuário ou null se não estiver logado
 * @param {string} searchTerm - Termo para filtrar cursos (opcional)
 * @returns {Promise<object>} - Cursos categorizados e filtrados
 */
export const fetchCategorizedCourses = async (userId, searchTerm = "") => {
  try {
    // Obter cursos categorizados (disponíveis, em progresso, concluídos)
    const { availableCourses, inProgressCourses, completedCourses } =
      await loadCategorizedCourses(userId);

    // Se tiver termo de busca, filtrar os resultados
    if (searchTerm) {
      return {
        availableCourses: filterCoursesBySearchTerm(
          availableCourses,
          searchTerm
        ),
        inProgressCourses: filterCoursesBySearchTerm(
          inProgressCourses,
          searchTerm
        ),
        completedCourses: filterCoursesBySearchTerm(
          completedCourses,
          searchTerm
        ),
      };
    }

    // Retornar todos os cursos se não houver filtro
    return { availableCourses, inProgressCourses, completedCourses };
  } catch (error) {
    console.error("Erro ao buscar cursos categorizados:", error);
    throw new Error(
      "Não foi possível carregar os cursos. Tente novamente mais tarde."
    );
  }
};

/**
 * Verifica se um curso requer PIN de acesso
 * @param {object} course - Dados do curso
 * @returns {boolean} - Verdadeiro se o curso requer PIN
 */
export const courseRequiresPin = (course) => {
  return course?.pinEnabled === true;
};

/**
 * Valida o PIN de acesso para um curso
 * @param {string} courseId - ID do curso
 * @param {string} enteredPin - PIN informado pelo usuário
 * @returns {Promise<boolean>} - Verdadeiro se o PIN for válido
 */
