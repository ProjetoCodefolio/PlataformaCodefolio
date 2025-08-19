import { database } from "$api/config/firebase";
import { ref, get } from "firebase/database";

/**
 * Capitaliza as palavras de um nome
 * @param {string} name - Nome a ser capitalizado
 * @returns {string} - Nome com palavras capitalizadas
 */
export const capitalizeWords = (name) => {
  if (!name) return "Nome Indisponível";
  return name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

/**
 * Busca todos os dados relacionados a um quiz
 * @param {string} quizId - ID do quiz
 * @returns {Promise<object>} - Dados do quiz, curso e resultados dos estudantes
 */
export const fetchQuizData = async (quizId) => {
  if (!quizId) {
    throw new Error("ID do quiz é obrigatório");
  }

  try {
    // Buscar todas as referências aos cursos
    const coursesRef = ref(database, "courses");
    const coursesSnapshot = await get(coursesRef);

    if (!coursesSnapshot.exists()) {
      throw new Error("Nenhum curso encontrado");
    }

    let foundQuiz = null;
    let foundCourse = null;
    let foundVideo = null;
    let foundCourseId = null;

    const quizzesPromises = [];
    const courseIds = [];

    // Para cada curso, procurar o quiz
    coursesSnapshot.forEach((courseSnapshot) => {
      const courseId = courseSnapshot.key;
      const quizRef = ref(database, `courseQuizzes/${courseId}/${quizId}`);
      quizzesPromises.push(get(quizRef));
      courseIds.push(courseId);
    });

    const quizzesResults = await Promise.all(quizzesPromises);

    // Encontrar o quiz e o curso correspondente
    for (let i = 0; i < quizzesResults.length; i++) {
      if (quizzesResults[i].exists()) {
        foundQuiz = quizzesResults[i].val();
        foundQuiz.videoId = quizId;
        foundCourseId = courseIds[i];

        // Buscar dados do curso
        const courseRef = ref(database, `courses/${courseIds[i]}`);
        const courseSnapshot = await get(courseRef);

        if (courseSnapshot.exists()) {
          foundCourse = courseSnapshot.val();
          foundCourse.courseId = courseIds[i];

          // Buscar dados do vídeo
          const videoRef = ref(
            database,
            `courseVideos/${courseIds[i]}/${quizId}`
          );
          const videoSnapshot = await get(videoRef);

          if (videoSnapshot.exists()) {
            foundVideo = videoSnapshot.val();
            foundVideo.id = quizId;
          }

          break;
        }
      }
    }

    if (!foundQuiz || !foundCourse) {
      throw new Error("Quiz ou curso não encontrado");
    }

    // Buscar resultados de quizzes ao vivo
    const liveQuizResultsRef = ref(
      database,
      `liveQuizResults/${foundCourse.courseId}/${quizId}`
    );
    const liveQuizResultsSnapshot = await get(liveQuizResultsRef);

    // Buscar resultados de quizzes personalizados
    const customQuizResultsRef = ref(
      database,
      `customQuizResults/${foundCourse.courseId}/${quizId}`
    );
    const customQuizResultsSnapshot = await get(customQuizResultsRef);

    const liveQuizResults = liveQuizResultsSnapshot.exists()
      ? liveQuizResultsSnapshot.val()
      : {};
    const customQuizResults = customQuizResultsSnapshot.exists()
      ? customQuizResultsSnapshot.val()
      : {};

    // Buscar resultados de todos os estudantes
    const studentResults = await fetchAllStudentResults(
      foundCourse.courseId,
      quizId,
      foundQuiz,
      liveQuizResults,
      customQuizResults
    );

    return {
      quiz: foundQuiz,
      courseData: foundCourse,
      videoData: foundVideo,
      studentResults,
      liveQuizResults,
      customQuizResults
    };
  } catch (error) {
    console.error("Erro ao buscar dados do quiz:", error);
    throw error;
  }
};

/**
 * Busca os resultados de todos os estudantes para um quiz específico
 * @param {string} courseId - ID do curso
 * @param {string} videoId - ID do vídeo/quiz
 * @param {object} quizObj - Objeto do quiz
 * @param {object} liveQuizData - Resultados do live quiz
 * @param {object} customQuizData - Resultados do custom quiz
 * @returns {Promise<Array>} - Lista de resultados dos estudantes
 */
export const fetchAllStudentResults = async (
  courseId,
  videoId,
  quizObj,
  liveQuizData,
  customQuizData
) => {
  try {
    // Buscar resultados dos estudantes para o quiz normal
    const results = await fetchStudentResults(courseId, videoId, quizObj);

    // Buscar informações de todos os usuários
    const usersRef = ref(database, "users");
    const usersSnapshot = await get(usersRef);
    const usersData = usersSnapshot.exists() ? usersSnapshot.val() : {};

    // Conjunto de IDs de estudantes já adicionados
    const allStudentIds = new Set(results.map((student) => student.userId));

    // Adicionar estudantes do live quiz que não estão na lista principal
    for (const userId in liveQuizData) {
      if (!allStudentIds.has(userId)) {
        const userData = usersData[userId] || {};

        let userName = "Usuário Desconhecido";
        if (userData.displayName) {
          userName = userData.displayName;
        } else if (userData.firstName) {
          userName = `${userData.firstName} ${userData.lastName || ""}`;
        } else if (userData.name) {
          userName = userData.name;
        } else if (userData.email) {
          userName = userData.email.split("@")[0];
        }

        results.push({
          userId,
          name: userName.trim() || "Usuário " + userId.substring(0, 6),
          email: userData.email || "Email não disponível",
          photoURL: userData.photoURL || "",
          score: 0,
          correctAnswers: 0,
          totalQuestions: quizObj.questions?.length || 0,
          passed: false,
          attemptCount: 0,
          lastAttemptDate: "Não realizou o quiz",
          onlyLiveQuiz: true,
        });

        allStudentIds.add(userId);
      }
    }

    // Adicionar estudantes do custom quiz que não estão na lista principal
    for (const userId in customQuizData) {
      if (!allStudentIds.has(userId)) {
        const userData = usersData[userId] || {};

        let userName = "Usuário Desconhecido";
        if (userData.displayName) {
          userName = userData.displayName;
        } else if (userData.firstName) {
          userName = `${userData.firstName} ${userData.lastName || ""}`;
        } else if (userData.name) {
          userName = userData.name;
        } else if (userData.email) {
          userName = userData.email.split("@")[0];
        }

        results.push({
          userId,
          name: userName.trim() || "Usuário " + userId.substring(0, 6),
          email: userData.email || "Email não disponível",
          photoURL: userData.photoURL || "",
          score: 0,
          correctAnswers: 0,
          totalQuestions: quizObj.questions?.length || 0,
          passed: false,
          attemptCount: 0,
          lastAttemptDate: "Não realizou o quiz",
          onlyCustomQuiz: true,
        });
      }
    }

    return results;
  } catch (error) {
    console.error("Erro ao buscar todos os resultados:", error);
    return [];
  }
};

/**
 * Busca os resultados de estudantes para um quiz específico
 * @param {string} courseId - ID do curso
 * @param {string} videoId - ID do vídeo/quiz
 * @param {object} quizObj - Objeto do quiz
 * @returns {Promise<Array>} - Lista de resultados dos estudantes
 */
export const fetchStudentResults = async (courseId, videoId, quizObj) => {
  try {
    if (!quizObj) {
      return [];
    }

    const quizResultsRef = ref(database, "quizResults");
    const quizResultsSnapshot = await get(quizResultsRef);

    if (!quizResultsSnapshot.exists()) {
      return [];
    }

    const usersRef = ref(database, "users");
    const usersSnapshot = await get(usersRef);
    const usersData = usersSnapshot.exists() ? usersSnapshot.val() : {};

    const results = [];
    const studentsData = quizResultsSnapshot.val();

    // Para cada usuário, verificar se tem resultado pa ra o quiz específico
    for (const userId in studentsData) {
      if (
        studentsData[userId] &&
        studentsData[userId][courseId] &&
        studentsData[userId][courseId][videoId]
      ) {
        const quizResult = studentsData[userId][courseId][videoId];
        const userData = usersData[userId] || {};

        // Determinar o nome do usuário
        let userName = "Usuário Desconhecido";
        if (userData.displayName) {
          userName = userData.displayName;
        } else if (userData.firstName) {
          userName = `${userData.firstName} ${userData.lastName || ""}`;
        } else if (userData.name) {
          userName = userData.name;
        } else if (userData.email) {
          userName = userData.email.split("@")[0];
        }

        // Calcular dados do resultado
        let correctAnswers = 0;
        const totalQuestionsInQuiz = quizObj.questions?.length || 0;

        const scorePercentage =
          quizResult.scorePercentage || quizResult.score || 0;

        if (quizResult.correctAnswers !== undefined) {
          correctAnswers = quizResult.correctAnswers;
        } else if (scorePercentage !== undefined) {
          correctAnswers = Math.round(
            (scorePercentage / 100) * totalQuestionsInQuiz
          );
        }

        // Verificar se o estudante passou no quiz
        const minPercentage = quizObj.minPercentage;
        const isPassed =
          quizResult.passed !== undefined
            ? quizResult.passed
            : quizResult.isPassed !== undefined
            ? quizResult.isPassed
            : scorePercentage >= minPercentage;

        // Formatar data da última tentativa
        let lastAttemptDate = "Data não disponível";
        if (quizResult.submittedAt) {
          try {
            lastAttemptDate = new Date(
              quizResult.submittedAt
            ).toLocaleDateString("pt-BR");
          } catch (e) {}
        } else if (quizResult.timestamp) {
          lastAttemptDate = new Date(
            quizResult.timestamp
          ).toLocaleDateString("pt-BR");
        } else if (quizResult.lastAttempt) {
          lastAttemptDate = new Date(
            quizResult.lastAttempt
          ).toLocaleDateString("pt-BR");
        } else if (quizResult.updatedAt) {
          lastAttemptDate = new Date(
            quizResult.updatedAt
          ).toLocaleDateString("pt-BR");
        }

        // Formatar hora da última tentativa
        let lastAttemptTime = "";
        try {
          if (quizResult.submittedAt) {
            const date = new Date(quizResult.submittedAt);
            lastAttemptTime = date.toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            });
          }
        } catch (e) {}

        if (lastAttemptDate !== "Data não disponível" && lastAttemptTime) {
          lastAttemptDate = `${lastAttemptDate} às ${lastAttemptTime}`;
        }

        // Adicionar resultado do estudante à lista
        results.push({
          userId,
          name: userName.trim() || "Usuário " + userId.substring(0, 6),
          email: userData.email || "Email não disponível",
          photoURL: userData.photoURL || "",
          score: scorePercentage,
          correctAnswers,
          totalQuestions: totalQuestionsInQuiz,
          passed: isPassed,
          attemptCount: quizResult.attemptCount || "#",
          lastAttemptDate: lastAttemptDate,
          detailedAnswers: quizResult.detailedAnswers || null,
        });
      }
    }

    return results;
  } catch (error) {
    console.error("Erro ao buscar resultados de estudantes:", error);
    return [];
  }
};

/**
 * Filtra e ordena resultados de estudantes
 * @param {Array} studentResults - Lista de resultados dos estudantes
 * @param {string} searchTerm - Termo de busca
 * @param {string} sortType - Tipo de ordenação
 * @returns {Array} - Lista filtrada e ordenada
 */
export const getSortedStudentResults = (studentResults, searchTerm, sortType) => {
  if (!studentResults.length) return [];

  let results = [...studentResults];

  // Filtragem por termo de busca
  if (searchTerm.trim() !== "") {
    const normalizedSearchTerm = searchTerm.toLowerCase().trim();
    results = results.filter(
      (student) =>
        student.name.toLowerCase().includes(normalizedSearchTerm) ||
        student.email.toLowerCase().includes(normalizedSearchTerm)
    );
  }

  // Ordenação dos resultados
  switch (sortType) {
    case "name":
      return results.sort((a, b) => a.name.localeCompare(b.name));
    case "score-high":
      return results.sort((a, b) => b.score - a.score);
    case "score-low":
      return results.sort((a, b) => a.score - b.score);
    case "date-recent":
      return results.sort((a, b) => {
        const getDateFromString = (dateStr) => {
          if (dateStr === "Data não disponível" || dateStr === "Não realizou o quiz") 
            return new Date(0);
          const datePart = dateStr.split(" às")[0];
          const [day, month, year] = datePart.split("/");
          return new Date(`${year}-${month}-${day}`);
        };

        return (
          getDateFromString(b.lastAttemptDate) -
          getDateFromString(a.lastAttemptDate)
        );
      });
    case "date-old":
      return results.sort((a, b) => {
        const getDateFromString = (dateStr) => {
          if (dateStr === "Data não disponível" || dateStr === "Não realizou o quiz") 
            return new Date(0);
          const datePart = dateStr.split(" às")[0];
          const [day, month, year] = datePart.split("/");
          return new Date(`${year}-${month}-${day}`);
        };

        return (
          getDateFromString(a.lastAttemptDate) -
          getDateFromString(b.lastAttemptDate)
        );
      });
    default:
      return results;
  }
};