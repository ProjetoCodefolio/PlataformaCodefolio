import { database } from '../../config/firebase';
import { ref, get, set, update, remove } from 'firebase/database';

/**
 * Atualiza o progresso de um curso para um estudante específico
 */
export const updateCourseProgress = async (userId, courseId, videos, totalVideos = null) => {
  if (!userId || !courseId) return;

  try {
    let newProgress = 0;
    
    // Se não for informado o total de vídeos, calcular baseado no array de vídeos
    if (totalVideos === null) {
      totalVideos = videos.length;
    }
    
    const studentCoursesRef = ref(database, `studentCourses/${userId}/${courseId}`);
    const studentCoursesSnapshot = await get(studentCoursesRef);

    if (totalVideos === 0) {
      newProgress = 0;
    } else {
      const videosRef = ref(database, `videoProgress/${userId}/${courseId}`);
      const videosSnapshot = await get(videosRef);
      const videosData = videosSnapshot.val() || {};
      
      // Apenas contar vídeos assistidos que ainda existem no curso atual
      const currentVideoIds = new Set(videos.map(video => video.id));
      const watchedVideos = Object.entries(videosData)
        .filter(([videoId, data]) => currentVideoIds.has(videoId) && data.watched)
        .length;
      
      newProgress = (watchedVideos / totalVideos) * 100;
    }

    // Determinar o status do curso baseado no progresso
    let status = 'in_progress';
    if (newProgress === 100) {
      status = 'completed';
    }

    // Atualizar o progresso do curso para o estudante
    await update(studentCoursesRef, { 
      progress: newProgress, 
      status: status,
      lastUpdated: new Date().toISOString()
    });
    
    return { progress: newProgress, status };
  } catch (error) {
    console.error("Erro ao atualizar progresso do curso:", error);
    throw error;
  }
};

/**
 * Matricula um estudante em um curso
 */
export const enrollStudentInCourse = async (userId, courseId, courseData) => {
  try {
    const studentCourseRef = ref(database, `studentCourses/${userId}/${courseId}`);
    
    // Verificar se o estudante já está matriculado
    const snapshot = await get(studentCourseRef);
    
    if (snapshot.exists()) {
      // Se já estiver matriculado, apenas atualizar os dados
      await update(studentCourseRef, {
        lastAccessed: new Date().toISOString(),
      });
    } else {
      // Se não estiver matriculado, criar novo registro
      await set(studentCourseRef, {
        courseId,
        title: courseData.title,
        progress: 0,
        status: "in_progress",
        enrolledAt: new Date().toISOString(),
        lastAccessed: new Date().toISOString(),
      });
    }
    
    return true;
  } catch (error) {
    console.error("Erro ao matricular estudante:", error);
    throw error;
  }
};

/**
 * Remove a matrícula de um estudante em um curso
 */
export const unenrollStudentFromCourse = async (userId, courseId) => {
  // try {
  //   // Remover da lista de cursos do estudante
  //   const studentCourseRef = ref(database, `studentCourses/${userId}/${courseId}`);
  //   await remove(studentCourseRef);
    
  //   // Remover progresso dos vídeos do curso
  //   const videoProgressRef = ref(database, `videoProgress/${userId}/${courseId}`);
  //   await remove(videoProgressRef);
    
  //   // Remover resultados de quiz
  //   const quizResultsRef = ref(database, `quizResults/${userId}/${courseId}`);
  //   await remove(quizResultsRef);
    
  //   return true;
  // } catch (error) {
  //   console.error("Erro ao remover matrícula:", error);
  //   throw error;
  // }
};

/**
 * Busca todos os cursos de um estudante
 */
export const fetchStudentCourses = async (userId) => {
  try {
    const studentCoursesRef = ref(database, `studentCourses/${userId}`);
    const snapshot = await get(studentCoursesRef);
    
    if (snapshot.exists()) {
      const coursesData = Object.entries(snapshot.val()).map(([courseId, course]) => ({
        courseId,
        ...course,
      }));
      
      return coursesData;
    }
    
    return [];
  } catch (error) {
    console.error("Erro ao buscar cursos do estudante:", error);
    throw error;
  }
};

/**
 * Busca todos os estudantes matriculados em um curso
 */
export const fetchCourseStudents = async (courseId) => {
  try {
    const studentCoursesRef = ref(database, `studentCourses`);
    const snapshot = await get(studentCoursesRef);
    
    if (!snapshot.exists()) {
      return [];
    }
    
    const studentsData = snapshot.val();
    const studentsList = [];
    
    // Para cada usuário, verificar se está matriculado no curso
    const userPromises = Object.entries(studentsData).map(async ([userId, courses]) => {
      if (courses[courseId]) {
        // Buscar dados do usuário
        const userData = await fetchStudentData(userId);
        
        if (userData) {
          studentsList.push({
            userId,
            name: userData.name || "Usuário " + userId.substring(0, 6),
            email: userData.email || "Email não disponível",
            photoURL: userData.photoURL || "",
            progress: courses[courseId].progress || 0,
            status: courses[courseId].status || "in_progress",
            enrolledAt: courses[courseId].enrolledAt || "",
            lastAccessed: courses[courseId].lastAccessed || "",
            role: userData.role || "student"
          });
        }
      }
    });
    
    await Promise.all(userPromises);
    return studentsList;
  } catch (error) {
    console.error("Erro ao buscar estudantes do curso:", error);
    throw error;
  }
};

/**
 * Busca todos os estudantes matriculados em um curso, com detalhes enriquecidos
 * @param {string} courseId - ID do curso
 * @returns {Promise<Array>} - Lista de estudantes com dados completos
 */
export const fetchCourseStudentsEnriched = async (courseId) => {
  try {
    if (!courseId) {
      throw new Error("ID do curso é necessário");
    }
    
    const studentCoursesRef = ref(database, `studentCourses`);
    const snapshot = await get(studentCoursesRef);
    
    if (!snapshot.exists()) {
      return [];
    }
    
    const studentsData = snapshot.val();
    const studentsList = [];
    
    // Para cada usuário, verificar se está matriculado no curso
    const studentPromises = Object.entries(studentsData).map(async ([userId, courses]) => {
      if (courses[courseId]) {
        // Buscar dados do usuário
        const userData = await fetchStudentData(userId);
        
        if (userData) {
          // Derivar o nome de exibição a partir dos dados disponíveis
          let displayName = "Usuário Desconhecido";
          if (userData.displayName) {
            displayName = userData.displayName;
          } else if (userData.firstName) {
            displayName = `${userData.firstName} ${userData.lastName || ""}`;
          } else if (userData.name) {
            displayName = userData.name;
          } else if (userData.email) {
            displayName = userData.email.split("@")[0];
          }
          
          // Verificar se o usuário é professor deste curso específico
          const isTeacher = userData.coursesTeacher && 
            userData.coursesTeacher[courseId] === true;
          
          // Combinar os dados do curso com os dados do usuário
          return {
            id: userId,
            userId: userId,
            name: displayName.trim() || "Usuário " + userId.substring(0, 6),
            ...courses[courseId],  // Dados específicos do curso
            ...userData,          // Dados do perfil do usuário (nome, email, etc)
            role: isTeacher ? "teacher" : "student", // Definir role com base em coursesTeacher
          };
        }
      }
      return null;
    });
    
    // Esperar todas as promessas serem resolvidas
    const studentsArray = await Promise.all(studentPromises);
    
    // Filtrar possíveis nulls (onde fetchStudentData falhou)
    return studentsArray.filter(student => student !== null);
  } catch (error) {
    console.error("Erro ao buscar estudantes do curso:", error);
    throw error;
  }
};

/**
 * Busca dados de um estudante específico
 */
export const fetchStudentData = async (userId) => {
  try {
    const studentsRef = ref(database, `users/${userId}`);
    const snapshot = await get(studentsRef);

    if (snapshot.exists()) {
      return snapshot.val();
    } else {
      console.log("Nenhum dado encontrado para o usuário:", userId);
      return null;
    }
  } catch (error) {
    console.error("Erro ao buscar dados do estudante:", error);
    return null;
  }
};

/**
 * Atualiza o papel (role) de um estudante em um curso
 */
export const updateStudentRole = async (userId, newRole) => {
  try {
    const userRef = ref(database, `users/${userId}`);
    await update(userRef, { role: newRole });
    return true;
  } catch (error) {
    console.error("Erro ao atualizar papel do estudante:", error);
    throw error;
  }
};

/**
 * Atualiza a função (role) de um estudante em um curso específico
 * @param {string} userId - ID do usuário
 * @param {string} courseId - ID do curso
 * @param {string} newRole - Nova função (teacher ou student)
 * @returns {Promise<boolean>} - Verdadeiro se a operação foi bem-sucedida
 */
export const updateStudentCourseRole = async (userId, courseId, newRole) => {
  try {
    if (!userId || !courseId) {
      throw new Error("IDs de usuário e curso são necessários");
    }
    
    const userRef = ref(database, `users/${userId}/coursesTeacher/${courseId}`);
    
    if (newRole === "teacher") {
      // Marcar como professor - adicionar courseId ao coursesTeacher
      await set(userRef, true);
    } else {
      // Remover marcação de professor - remover courseId do coursesTeacher
      await set(userRef, null);
    }
    
    return true;
  } catch (error) {
    console.error("Erro ao atualizar função do estudante:", error);
    throw error;
  }
};

/**
 * Remove um estudante de um curso
 * @param {string} userId - ID do usuário
 * @param {string} courseId - ID do curso
 * @returns {Promise<boolean>} - Verdadeiro se bem-sucedido
 */
export const removeStudentFromCourse = async (userId, courseId) => {
  try {
    if (!userId || !courseId) {
      throw new Error("IDs de usuário e curso são necessários");
    }
    
    // Remover matrícula do estudante
    await unenrollStudentFromCourse(userId, courseId);
    
    return true;
  } catch (error) {
    console.error("Erro ao remover estudante do curso:", error);
    throw error;
  }
};

/**
 * Verifica se o usuário é apenas professor do curso (não é o admin)
 * @param {string} userId - ID do usuário
 * @param {string} courseId - ID do curso
 * @param {string} courseAdminId - ID do admin do curso
 * @returns {Promise<boolean>} - Verdadeiro se o usuário é apenas professor
 */
export const checkUserCourseRole = async (userId, courseId, courseAdminId) => {
  try {
    if (!userId || !courseId) {
      return false;
    }
    
    // Buscar informações do usuário atual
    const userRef = ref(database, `users/${userId}/coursesTeacher/${courseId}`);
    const snapshot = await get(userRef);
    
    // Verificar se o usuário é professor mas não é o admin do curso
    return snapshot.exists() && courseAdminId !== userId;
  } catch (error) {
    console.error("Erro ao verificar papel do usuário:", error);
    return false;
  }
};