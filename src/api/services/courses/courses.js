import { ref, get, set, push, update, remove } from "firebase/database";
import { database } from "../../config/firebase";
import { 
  hasCourseVideos, 
  hasCourseMaterials, 
  hasCourseQuizzes, 
  hasCourseSlides 
} from "../../utils/courseUtils";
import { updateCourseProgress } from './students';

export const fetchCourses = async (limit) => {
  try {
    const coursesRef = ref(database, "courses");
    const snapshot = await get(coursesRef);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      const coursesArray = Object.entries(data).map(([courseId, course]) => ({
        courseId,
        ...course,
      }));
      
      return limit ? coursesArray.slice(0, limit) : coursesArray;
    }
    return [];
  } catch (error) {
    console.error("Erro ao carregar cursos:", error);
    return [];
  }
};

export const checkStudentCourseEnrollment = async (userId, courseId) => {
  try {
    const courseStudentsRef = ref(database, `studentCourses/${userId}/${courseId}`);
    const snapshot = await get(courseStudentsRef);
    return snapshot.exists();
  } catch (error) {
    console.error("Erro ao verificar se o estudante está inscrito no curso:", error);
    return false;
  }
};

export const fetchTeacherCourses = async (userId) => {
  if (!userId) return null;
  
  try {
    const coursesTeacherRef = ref(database, `users/${userId}/coursesTeacher`);
    const snapshot = await get(coursesTeacherRef);
    
    if (snapshot.exists()) {
      return snapshot.val();
    }
    return null;
  } catch (error) {
    console.error("Erro ao buscar cursos do professor:", error);
    return null;
  }
};

/**
 * Carrega todos os cursos e os categoriza por status (disponível, em progresso, concluído)
 * @param {string} userId - ID do usuário ou null se não estiver logado
 * @returns {Promise<{availableCourses, inProgressCourses, completedCourses}>}
 */
export const loadCategorizedCourses = async (userId) => {
  try {
    // Buscar todos os cursos
    const coursesRef = ref(database, "courses");
    const snapshot = await get(coursesRef);
    if (!snapshot.exists()) return { availableCourses: [], inProgressCourses: [], completedCourses: [] };

    const coursesData = snapshot.val();
    const coursesArray = Object.entries(coursesData).map(([courseId, course]) => ({
      courseId,
      ...course,
    }));

    // Se o usuário estiver logado, buscar o progresso dos cursos do usuário
    if (userId) {
      return await loadUserCourses(userId, coursesArray);
    } else {
      // Caso contrário, carregar progresso da sessão para usuários não logados
      return await loadAnonymousCourses(coursesArray);
    }
  } catch (error) {
    console.error("Erro ao carregar cursos:", error);
    return { availableCourses: [], inProgressCourses: [], completedCourses: [] };
  }
};

/**
 * Carrega os cursos para um usuário logado
 * @param {string} userId - ID do usuário
 * @param {Array} coursesArray - Array de cursos
 * @returns {Promise<{availableCourses, inProgressCourses, completedCourses}>}
 */
const loadUserCourses = async (userId, coursesArray) => {
  try {
    const studentCoursesRef = ref(database, `studentCourses/${userId}`);
    const studentSnapshot = await get(studentCoursesRef);
    const studentCourses = studentSnapshot.val() || {};

    const enrichedCourses = coursesArray.map((course) => {
      const studentCourse = studentCourses[course.courseId] || {};
      return {
        ...course,
        progress: studentCourse.progress !== undefined ? studentCourse.progress : 0,
        accessed: studentCourse.progress !== undefined,
        status: studentCourse.status || "available",
      };
    });

    const available = enrichedCourses.filter((course) => !course.accessed);
    const inProgress = enrichedCourses.filter((course) => course.accessed && course.status === "in_progress");
    const completed = enrichedCourses.filter((course) => course.status === "completed");

    return { 
      availableCourses: available,
      inProgressCourses: inProgress,
      completedCourses: completed
    };
  } catch (error) {
    console.error("Erro ao carregar cursos do usuário:", error);
    return { availableCourses: [], inProgressCourses: [], completedCourses: [] };
  }
};

/**
 * Carrega os cursos para um usuário anônimo
 * @param {Array} coursesArray - Array de cursos
 * @returns {Promise<{availableCourses, inProgressCourses, completedCourses}>}
 */
const loadAnonymousCourses = async (coursesArray) => {
  try {
    const storedProgress = sessionStorage.getItem("videoProgress");
    let localProgress = {};

    if (storedProgress) {
      const progressArray = JSON.parse(storedProgress);
      localProgress = progressArray.reduce((acc, video) => {
        const courseId = video.courseId;
        if (!acc[courseId]) {
          acc[courseId] = { totalVideos: 0, completedVideos: 0 };
        }
        acc[courseId].totalVideos += 1;
        if (video.watched && (!video.quizId || video.quizPassed)) {
          acc[courseId].completedVideos += 1;
        }
        return acc;
      }, {});
    }

    const enrichedCourses = await Promise.all(
      coursesArray.map(async (course) => {
        const courseVideosRef = ref(database, `courseVideos/${course.courseId}`);
        const videoSnapshot = await get(courseVideosRef);
        const videosData = videoSnapshot.val() || {};
        const totalVideos = Object.keys(videosData).length;
        const progressData = localProgress[course.courseId] || { totalVideos: 0, completedVideos: 0 };
        const effectiveTotal = Math.max(totalVideos, progressData.totalVideos);
        const progress = effectiveTotal > 0 ? (progressData.completedVideos / effectiveTotal) * 100 : 0;

        return {
          ...course,
          progress,
          accessed: progressData.totalVideos > 0,
        };
      })
    );

    const available = enrichedCourses.filter((course) => !course.accessed);
    const inProgress = enrichedCourses.filter((course) => course.accessed && course.progress < 100);
    const completed = enrichedCourses.filter((course) => course.progress === 100);

    return { 
      availableCourses: available,
      inProgressCourses: inProgress,
      completedCourses: completed
    };
  } catch (error) {
    console.error("Erro ao carregar cursos para usuário anônimo:", error);
    return { availableCourses: [], inProgressCourses: [], completedCourses: [] };
  }
};

/**
 * Filtra cursos por termo de pesquisa
 * @param {Array} courses - Array de cursos a serem filtrados
 * @param {string} searchTerm - Termo de pesquisa
 * @returns {Array} Cursos filtrados
 */
export const filterCoursesBySearchTerm = (courses, searchTerm) => {
  const term = searchTerm.toLowerCase();
  return courses.filter(
    (course) =>
      course.title.toLowerCase().includes(term) ||
      (course.description && course.description.toLowerCase().includes(term))
  );
};

/**
 * Busca os cursos criados por um usuário específico
 * @param {string} userId - ID do usuário
 * @returns {Promise<Array>} - Array de cursos
 */
export const fetchUserCreatedCourses = async (userId) => {
  try {
    if (!userId) {
      return [];
    }

    const coursesRef = ref(database, "courses");
    const snapshot = await get(coursesRef);

    if (snapshot.exists()) {
      const data = snapshot.val();
      const coursesData = Object.entries(data)
        .map(([courseId, course]) => ({
          courseId,
          ...course,
        }))
        .filter((course) => course.userId === userId);

      return coursesData;
    } 
    
    return [];
  } catch (error) {
    console.error("Erro ao carregar cursos do usuário:", error);
    throw error;
  }
};

/**
 * Deleta um curso e todas as suas referências
 * @param {string} courseId - ID do curso a ser deletado
 * @returns {Promise<{success: boolean, message: string}>} - Resultado da operação
 */
export const deleteCourse = async (courseId) => {
  try {
    if (!courseId) {
      return { success: false, message: "ID do curso não fornecido" };
    }

    // Verificar se o curso possui conteúdo associado
    const [videos, materials, quizzes, slides] = await Promise.all([
      hasCourseVideos(courseId),
      hasCourseMaterials(courseId),
      hasCourseQuizzes(courseId),
      hasCourseSlides(courseId),
    ]);

    if (
      videos.length > 0 ||
      materials.length > 0 ||
      quizzes.length > 0 ||
      slides.length > 0
    ) {
      return { 
        success: false, 
        message: "Não é possível deletar o curso pois existem vídeos, materiais, slides ou quizzes associados a ele."
      };
    }

    // Deleta o curso da tabela courses
    await remove(ref(database, `courses/${courseId}`));

    // Deleta o curso da tabela studentCourses para todos os usuários
    const studentCoursesRef = ref(database, `studentCourses`);
    const studentCoursesSnapshot = await get(studentCoursesRef);
    const studentCoursesData = studentCoursesSnapshot.val();

    if (studentCoursesData) {
      const updates = {};
      Object.keys(studentCoursesData).forEach((userId) => {
        if (studentCoursesData[userId][courseId]) {
          updates[`studentCourses/${userId}/${courseId}`] = null;
        }
      });
      await update(ref(database), updates);
    }

    // Deleta o curso da tabela videoProgress para todos os usuários
    const videoProgressRef = ref(database, `videoProgress`);
    const videoProgressSnapshot = await get(videoProgressRef);
    const videoProgressData = videoProgressSnapshot.val();

    if (videoProgressData) {
      const updates = {};
      Object.keys(videoProgressData).forEach((userId) => {
        if (videoProgressData[userId][courseId]) {
          updates[`videoProgress/${userId}/${courseId}`] = null;
        }
      });
      await update(ref(database), updates);
    }

    return { success: true, message: "Curso deletado com sucesso" };
  } catch (error) {
    console.error("Erro ao deletar curso:", error);
    return { success: false, message: "Erro ao deletar o curso: " + error.message };
  }
};

export const updateAllUsersCourseProgress = async (courseId, videos) => {
  try {
    // Obter todos os usuários que estão matriculados no curso
    const studentCoursesRef = ref(database, `studentCourses`);
    const snapshot = await get(studentCoursesRef);
    
    if (!snapshot.exists()) return;
    
    const studentCourses = snapshot.val();
    const totalVideos = videos.length;
    
    for (const userId in studentCourses) {
      if (studentCourses[userId][courseId]) {
        await updateCourseProgress(userId, courseId, videos, totalVideos);
      }
    }
  } catch (error) {
    console.error("Erro ao atualizar progresso do curso:", error);
    throw error;
  }
};

/**
 * Busca detalhes de um curso específico
 * @param {string} courseId - ID do curso
 * @returns {Promise<Object|null>} - Dados do curso ou null se não encontrado
 */
export const fetchCourseDetails = async (courseId) => {
  try {
    if (!courseId) return null;
    
    const courseRef = ref(database, `courses/${courseId}`);
    const courseSnapshot = await get(courseRef);
    
    if (courseSnapshot.exists()) {
      return courseSnapshot.val();
    }
    
    return null;
  } catch (error) {
    console.error("Erro ao buscar detalhes do curso:", error);
    throw error;
  }
};

/**
 * Cria um novo curso
 * @param {Object} courseData - Dados do curso a ser criado
 * @param {string} userId - ID do usuário criador do curso
 * @returns {Promise<{courseId: string, courseData: Object}>} - ID do curso criado e dados
 */
export const createCourse = async (courseData, userId) => {
  try {
    // Validação básica
    if (!userId || !courseData.title || !courseData.description) {
      throw new Error("Dados insuficientes para criar o curso");
    }
    
    const courseRef = ref(database, "courses");
    const newCourseRef = push(courseRef);
    
    const finalCourseData = {
      ...courseData,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Se o curso tiver PIN habilitado, garantimos que haja um PIN
    if (finalCourseData.pinEnabled && !finalCourseData.pin) {
      finalCourseData.pin = Math.floor(1000000 + Math.random() * 9000000).toString();
    }
    
    await set(newCourseRef, finalCourseData);
    
    return { 
      courseId: newCourseRef.key,
      courseData: finalCourseData
    };
  } catch (error) {
    console.error("Erro ao criar curso:", error);
    throw error;
  }
};

/**
 * Atualiza um curso existente
 * @param {string} courseId - ID do curso a ser atualizado
 * @param {Object} courseData - Novos dados do curso
 * @returns {Promise<{success: boolean, courseData: Object}>} - Status da operação
 */
export const updateCourse = async (courseId, courseData) => {
  try {
    if (!courseId) {
      throw new Error("ID do curso é obrigatório para atualização");
    }
    
    const courseRef = ref(database, `courses/${courseId}`);
    const updatedData = {
      ...courseData,
      updatedAt: new Date().toISOString()
    };
    
    await update(courseRef, updatedData);
    
    return { 
      success: true,
      courseData: updatedData
    };
  } catch (error) {
    console.error("Erro ao atualizar curso:", error);
    throw error;
  }
};

/**
 * Salva um curso (cria novo ou atualiza existente)
 * @param {string|null} courseId - ID do curso (null para criar novo)
 * @param {Object} courseData - Dados do curso
 * @param {string} userId - ID do usuário
 * @returns {Promise<{courseId: string, isNew: boolean, courseData: Object}>} - Resultado da operação
 */
export const saveCourse = async (courseId, courseData, userId) => {
  try {
    if (courseId) {
      // Atualizar curso existente
      const result = await updateCourse(courseId, courseData);
      return { 
        courseId, 
        isNew: false, 
        courseData: result.courseData
      };
    } else {
      // Criar novo curso
      const result = await createCourse(courseData, userId);
      return { 
        courseId: result.courseId, 
        isNew: true, 
        courseData: result.courseData
      };
    }
  } catch (error) {
    console.error("Erro ao salvar curso:", error);
    throw error;
  }
};

/**
 * Valida se um curso pode ser salvo
 * @param {Object} courseData - Dados do curso
 * @param {Array} quizzes - Lista de quizzes
 * @returns {Promise<{isValid: boolean, error: string|null}>} - Resultado da validação
 */
export const validateCourseData = async (courseData, quizzes) => {
  try {
    if (!courseData.title?.trim() || !courseData.description?.trim()) {
      return {
        isValid: false,
        error: "Preencha todos os campos obrigatórios"
      };
    }
    
    // Verificar se há quizzes sem questões
    if (quizzes && quizzes.some((quiz) => quiz.questions.length === 0)) {
      return {
        isValid: false,
        error: "Não é possível salvar um curso com quizzes sem questões"
      };
    }
    
    return { isValid: true, error: null };
  } catch (error) {
    console.error("Erro ao validar dados do curso:", error);
    return { isValid: false, error: error.message };
  }
};