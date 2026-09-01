import { database } from '../../config/firebase';
import { ref, get, set, update, remove } from 'firebase/database';
import { isDiscipline, isCourseClosed } from './courseType';

/**
 * Um item de conteúdo conta como CONCLUÍDO quando foi assistido (slides já
 * entram como vistos) e, havendo quiz associado, o quiz foi aprovado.
 * É a mesma definição usada pelo check verde da lista e pela conclusão do curso.
 * @param {Object} item - item de conteúdo com { watched, quizId, quizPassed }
 * @returns {boolean}
 */
export const isContentCompleted = (item) =>
  !!item && !!item.watched && (!item.quizId || !!item.quizPassed);

/**
 * Grava progresso e status de um aluno respeitando o encerramento manual.
 *
 * Numa disciplina encerrada o professor já disse que a turma acabou. Se o
 * cálculo de progresso pudesse escrever `status` livremente, o primeiro vídeo
 * que o aluno abrisse depois disso o devolveria para "in_progress" e desfaria o
 * encerramento sem ninguém perceber. O progresso continua sendo gravado — é
 * informação real —, mas o status fica onde o professor deixou.
 *
 * Numa disciplina que ainda não foi encerrada, 100% de progresso sozinho
 * também não conclui: só o encerramento manual do professor (`closeDiscipline`)
 * leva a turma inteira a "completed" de uma vez. Sem essa trava, o próprio
 * aluno levaria o curso a "concluído" assistindo tudo, o que é exatamente o
 * comportamento que a disciplina existe para não ter.
 *
 * @param {string} userId
 * @param {string} courseId
 * @param {number} progress - progresso recém-calculado
 * @param {string} status - status recém-calculado
 * @returns {Promise<{progress: number, status: string}>}
 */
const persistProgress = async (userId, courseId, progress, status) => {
  const caminho = `studentCourses/${userId}/${courseId}`;
  const [studentSnapshot, courseSnapshot] = await Promise.all([
    get(ref(database, caminho)),
    get(ref(database, `courses/${courseId}`)),
  ]);
  const atual = studentSnapshot.val() || {};
  const course = courseSnapshot.val() || {};

  if (atual.closedByTeacher) {
    await update(ref(database, caminho), {
      progress,
      // Guarda o status que o aluno teria, para que reabrir a disciplina o
      // devolva ao lugar certo em vez de a um retrato velho.
      statusBeforeClosure: status,
      lastUpdated: new Date().toISOString(),
    });
    return { progress, status: "completed" };
  }

  const finalStatus =
    status === "completed" && isDiscipline(course) && !isCourseClosed(course)
      ? "in_progress"
      : status;

  await update(ref(database, caminho), {
    progress,
    status: finalStatus,
    lastUpdated: new Date().toISOString(),
  });
  return { progress, status: finalStatus };
};

/**
 * Atualiza o progresso de um curso para um estudante a partir da lista de
 * conteúdo JÁ carregada com o estado do aluno (watched/quizPassed). É a fonte
 * única de verdade do progresso:
 *  - considera todo o conteúdo (vídeos + slides), exceto itens independentes;
 *  - deduplica por id (conteúdo pode existir na coleção nova e na legada);
 *  - um item só conta como concluído via `isContentCompleted` (assistido e,
 *    havendo quiz, aprovado).
 * Não relê o Firebase: o array recebido já reflete o estado do aluno, o que
 * mantém o cálculo alinhado com a UI e evita regressões por leituras vazias.
 */
export const updateCourseProgress = async (userId, courseId, videos = []) => {
  if (!userId || !courseId) return;

  try {
    // Deduplica por id; em caso de duplicata, prevalece a versão "mais concluída".
    const contentById = new Map();
    for (const item of videos) {
      if (!item || item.isIndependent || item.id == null) continue;
      const prev = contentById.get(item.id);
      if (!prev || (isContentCompleted(item) && !isContentCompleted(prev))) {
        contentById.set(item.id, item);
      }
    }

    const total = contentById.size;
    let completed = 0;
    contentById.forEach((item) => {
      if (isContentCompleted(item)) completed += 1;
    });

    const newProgress = total > 0 ? (completed / total) * 100 : 0;
    const status = newProgress >= 100 ? "completed" : "in_progress";

    return await persistProgress(userId, courseId, newProgress, status);
  } catch (error) {
    console.error("Erro ao atualizar progresso do curso:", error);
    throw error;
  }
};

/**
 * Recálculo em massa (disparado quando o professor edita os vídeos do curso):
 * calcula o progresso apenas a partir dos vídeos ASSISTIDOS no Firebase, sem
 * considerar quizzes nem slides — pois aqui só temos a lista genérica de vídeos,
 * não o estado por-aluno. O valor é reconciliado com a definição completa
 * (`updateCourseProgress`) no próximo carregamento do curso pelo aluno.
 */
export const recalcCourseProgressFromWatched = async (
  userId,
  courseId,
  videos,
  totalVideos = null
) => {
  if (!userId || !courseId) return;

  try {
    let newProgress = 0;

    if (totalVideos === null) {
      totalVideos = videos.length;
    }

    if (totalVideos === 0) {
      newProgress = 0;
    } else {
      const videosRef = ref(database, `videoProgress/${userId}/${courseId}`);
      const videosSnapshot = await get(videosRef);
      const videosData = videosSnapshot.val() || {};

      const currentVideoIds = new Set(videos.map((video) => video.id));
      const watchedVideos = Object.entries(videosData).filter(
        ([videoId, data]) => currentVideoIds.has(videoId) && data.watched
      ).length;

      newProgress = (watchedVideos / totalVideos) * 100;
    }

    const status = newProgress === 100 ? "completed" : "in_progress";

    return await persistProgress(userId, courseId, newProgress, status);
  } catch (error) {
    console.error("Erro ao recalcular progresso do curso:", error);
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
  try {
    if (!userId || !courseId) {
      throw new Error("IDs de usuário e curso são necessários");
    }

    // Remove, em cascata e de forma atômica, todos os dados deste aluno NESTE
    // curso. O Realtime Database não tem cascata nativa, então cada nó precisa
    // ser limpo manualmente para não deixar registros órfãos.
    const updates = {};

    // Dados chaveados por userId/courseId
    updates[`studentCourses/${userId}/${courseId}`] = null;
    updates[`videoProgress/${userId}/${courseId}`] = null;
    updates[`quizResults/${userId}/${courseId}`] = null;
    // Caso o aluno também seja professor deste curso, remover a flag
    updates[`users/${userId}/coursesTeacher/${courseId}`] = null;

    // Resultados chaveados por courseId/quizId/userId — varrer por quizId
    const [customSnap, liveSnap, gigiSnap, openEndedSnap] = await Promise.all([
      get(ref(database, `customQuizResults/${courseId}`)),
      get(ref(database, `liveQuizResults/${courseId}`)),
      get(ref(database, `quizGigi/${courseId}`)),
      get(ref(database, `openEndedAnswers/${courseId}`)),
    ]);

    const addUserUnderQuiz = (snapshot, node) => {
      const data = snapshot.val();
      if (!data) return;
      Object.keys(data).forEach((quizId) => {
        if (data[quizId] && data[quizId][userId] !== undefined) {
          updates[`${node}/${courseId}/${quizId}/${userId}`] = null;
        }
      });
    };
    addUserUnderQuiz(customSnap, "customQuizResults");
    addUserUnderQuiz(liveSnap, "liveQuizResults");

    // O Quiz Gigi tem dois níveis a mais que os outros resultados:
    // quizGigi/{courseId}/{quizId}/results/{questionId}/{correct|wrong}Answers/{userId}
    const gigiData = gigiSnap.val();
    if (gigiData) {
      Object.entries(gigiData).forEach(([quizId, quiz]) => {
        const results = quiz?.results;
        if (!results) return;
        Object.entries(results).forEach(([questionId, questao]) => {
          ["correctAnswers", "wrongAnswers"].forEach((balde) => {
            if (questao?.[balde] && questao[balde][userId] !== undefined) {
              updates[
                `quizGigi/${courseId}/${quizId}/results/${questionId}/${balde}/${userId}`
              ] = null;
            }
          });
        });
      });
    }

    // openEndedAnswers tem um nível a mais: courseId/quizId/questionId/userId
    const openEndedData = openEndedSnap.val();
    if (openEndedData) {
      Object.keys(openEndedData).forEach((quizId) => {
        const questions = openEndedData[quizId];
        if (!questions) return;
        Object.keys(questions).forEach((questionId) => {
          if (questions[questionId] && questions[questionId][userId] !== undefined) {
            updates[`openEndedAnswers/${courseId}/${quizId}/${questionId}/${userId}`] = null;
          }
        });
      });
    }

    await update(ref(database), updates);
    return true;
  } catch (error) {
    console.error("Erro ao remover matrícula:", error);
    throw error;
  }
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