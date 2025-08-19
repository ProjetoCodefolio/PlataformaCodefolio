import {
  ref,
  get,
  set,
  update,
  serverTimestamp,
  push,
  increment,
} from "firebase/database";
import { database } from "../../config/firebase";

/**
 * Inicializa os metadados do quiz na estrutura quizGigi
 * @param {string} courseId - ID do curso
 * @param {object} quizData - Dados do quiz
 * @param {string} courseTitle - Título do curso
 * @returns {Promise<object>} - Metadados do quiz
 */
export const initializeQuizMetadata = async (
  courseId,
  quizData,
  courseTitle
) => {
  try {
    if (!courseId || !quizData?.id) {
      throw new Error("IDs de curso e quiz são obrigatórios");
    }

    // Se o título do curso não foi fornecido, tenta buscar
    let finalCourseTitle = courseTitle;
    if (!finalCourseTitle) {
      try {
        const courseRef = ref(database, `courses/${courseId}`);
        const courseSnapshot = await get(courseRef);
        if (courseSnapshot.exists()) {
          const courseData = courseSnapshot.val();
          finalCourseTitle = courseData.title || "Curso sem título";
        }
      } catch (e) {
        console.error("Erro ao buscar título do curso:", e);
      }
    }

    const quizRef = ref(
      database,
      `quizGigi/courses/${courseId}/quizzes/${quizData.id}`
    );

    const quizMetadata = {
      id: quizData.id,
      courseId: courseId,
      courseName: finalCourseTitle || "Curso sem título",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (quizData.questions && quizData.questions.length > 0) {
      quizMetadata.questionsData = quizData.questions.map((q, index) => ({
        id: q.id || `question_${index}`,
        text: q.question,
        correctOption: q.correctOption,
      }));
      quizMetadata.totalQuestions = quizData.questions.length;
    }

    const quizSnapshot = await get(quizRef);
    if (!quizSnapshot.exists()) {
      await set(quizRef, quizMetadata);
    }

    return quizMetadata;
  } catch (error) {
    console.error("Erro ao inicializar metadados do quiz:", error);
    throw error;
  }
};

/**
 * Busca estudantes matriculados no curso
 * @param {string} courseId - ID do curso
 * @returns {Promise<Array>} - Lista de estudantes matriculados
 */
export const fetchEnrolledStudents = async (courseId) => {
  try {
    const enrolledStudentsRef = ref(database, `studentCourses`);
    const enrolledStudentsSnapshot = await get(enrolledStudentsRef);

    if (!enrolledStudentsSnapshot.exists()) {
      return [];
    }

    const enrolledData = enrolledStudentsSnapshot.val();
    const studentsPromises = [];
    const studentIds = [];

    // Para cada usuário, verificar se está matriculado no curso
    Object.entries(enrolledData).forEach(([userId, courses]) => {
      if (courses[courseId]) {
        const userRef = ref(database, `users/${userId}`);
        studentsPromises.push(get(userRef));
        studentIds.push(userId);
      }
    });

    const studentsSnapshots = await Promise.all(studentsPromises);
    const enrolledStudents = [];

    studentsSnapshots.forEach((snapshot, index) => {
      if (snapshot.exists()) {
        const userData = snapshot.val();
        let name = "Usuário Desconhecido";

        if (userData.displayName) {
          name = userData.displayName;
        } else if (userData.firstName) {
          name = `${userData.firstName} ${userData.lastName || ""}`.trim();
        } else if (userData.name) {
          name = userData.name;
        } else if (userData.email) {
          name = userData.email.split("@")[0];
        }

        enrolledStudents.push({
          userId: studentIds[index],
          name: name,
          email: userData.email || "",
          photoURL: userData.photoURL || "",
          disabled: false,
        });
      }
    });

    return enrolledStudents;
  } catch (error) {
    console.error("Erro ao buscar estudantes matriculados:", error);
    return [];
  }
};

/**
 * Registra resposta de estudante no quiz
 * @param {string} courseId - ID do curso
 * @param {string} quizId - ID do quiz
 * @param {string} questionId - ID da questão
 * @param {object} student - Dados do estudante
 * @param {boolean} isCorrect - Se a resposta está correta
 * @param {number} selectedOption - Opção selecionada
 * @param {boolean} isCustomMode - Se é modo personalizado
 * @returns {Promise<boolean>} - Sucesso da operação
 */
export const registerStudentAnswer = async (
  courseId,
  quizId,
  questionId,
  student,
  isCorrect,
  selectedOption,
  isCustomMode = false
) => {
  try {
    if (!courseId || !quizId || !questionId || !student) {
      console.error("Dados incompletos para registrar resposta");
      return false;
    }

    const answerData = {
      studentId: student.userId,
      studentName: student.name,
      photoURL: student.photoURL || "",
      selectedOption,
      timestamp: Date.now(),
    };

    if (isCustomMode) {
      const customRef = ref(
        database,
        `customQuizResults/${courseId}/${quizId}/${student.userId}/${questionId}`
      );
      await set(customRef, answerData);
    } else {
      const resultsPath = `quizGigi/courses/${courseId}/quizzes/${quizId}/results/${questionId}/${
        isCorrect ? "correctAnswers" : "wrongAnswers"
      }/${student.userId}`;

      const resultsRef = ref(database, resultsPath);
      await set(resultsRef, answerData);
    }

    return true;
  } catch (error) {
    console.error("Erro ao registrar resposta do estudante:", error);
    return false;
  }
};

/**
 * Atualiza a contagem de acertos do estudante
 * @param {string} courseId - ID do curso
 * @param {string} quizId - ID do quiz
 * @param {object} student - Dados do estudante
 * @param {boolean} isCorrect - Se a resposta está correta
 * @returns {Promise<boolean>} - Sucesso da operação
 */
export const updateStudentCorrectAnswer = async (
  courseId,
  quizId,
  student,
  isCorrect = true
) => {
  if (!student || !courseId || !quizId) return false;

  try {
    const resultRef = ref(
      database,
      `liveQuizResults/${courseId}/${quizId}/${student.userId}`
    );

    // Verificar se já existe um registro para este estudante
    const snapshot = await get(resultRef);

    if (snapshot.exists()) {
      // Atualizar registro existente
      await update(resultRef, {
        correctAnswers: isCorrect ? increment(1) : increment(0),
        lastUpdate: serverTimestamp(),
      });
    } else {
      // Criar novo registro
      await set(resultRef, {
        studentId: student.userId,
        studentName: student.name,
        photoURL: student.photoURL || "",
        correctAnswers: isCorrect ? 1 : 0,
        createdAt: serverTimestamp(),
        lastUpdate: serverTimestamp(),
      });
    }

    return true;
  } catch (error) {
    console.error("Erro ao atualizar acertos do estudante:", error);
    return false;
  }
};

/**
 * Atualiza contagem de sorteios do estudante
 * @param {string} courseId - ID do curso
 * @param {string} quizId - ID do quiz
 * @param {string} userId - ID do usuário
 * @param {boolean} isCustomMode - Se é modo personalizado
 * @returns {Promise<boolean>} - Sucesso da operação
 */
export const updateStudentDrawCount = async (
  courseId,
  quizId,
  userId,
  isCustomMode = false
) => {
  try {
    if (!courseId || !quizId || !userId) {
      return false;
    }

    const basePath = isCustomMode ? "customQuizResults" : "liveQuizResults";
    const countRef = ref(
      database,
      `${basePath}/${courseId}/${quizId}/${userId}`
    );

    // Buscar dados atuais
    const snapshot = await get(countRef);
    const currentData = snapshot.exists() ? snapshot.val() : {};

    // Incrementar a contagem de sorteios
    const updatedData = {
      ...currentData,
      timesDraw: (currentData.timesDraw || 0) + 1,
    };

    // Salvar no Firebase
    await set(countRef, updatedData);
    return true;
  } catch (error) {
    console.error("Erro ao atualizar contagem de sorteios:", error);
    return false;
  }
};

/**
 * Carrega os resultados do quiz
 * @param {string} courseId - ID do curso
 * @param {string} quizId - ID do quiz
 * @returns {Promise<object>} - Resultados do quiz
 */
export const fetchQuizResults = async (courseId, quizId) => {
  try {
    const path = `quizGigi/courses/${courseId}/quizzes/${quizId}/results`;
    const resultsRef = ref(database, path);

    const resultsSnapshot = await get(resultsRef);
    if (resultsSnapshot.exists()) {
      return resultsSnapshot.val();
    }
    return {};
  } catch (error) {
    console.error("Erro ao buscar resultados do quiz:", error);
    return {};
  }
};

/**
 * Busca resultados do custom quiz
 * @param {string} courseId - ID do curso
 * @param {string} quizId - ID do quiz
 * @returns {Promise<object>} - Resultados do custom quiz
 */
export const fetchCustomQuizResults = async (courseId, quizId) => {
  try {
    const resultsRef = ref(database, `customQuizResults/${courseId}/${quizId}`);
    const resultsSnapshot = await get(resultsRef);

    if (resultsSnapshot.exists()) {
      return {
        correctAnswers: resultsSnapshot.val(),
      };
    }

    return { correctAnswers: {} };
  } catch (error) {
    console.error("Erro ao buscar resultados de quiz personalizado:", error);
    return { correctAnswers: {} };
  }
};

/**
 * Busca resultados do live quiz
 * @param {string} courseId - ID do curso
 * @param {string} quizId - ID do quiz
 * @returns {Promise<object>} - Resultados do live quiz
 */
export const fetchLiveQuizResults = async (courseId, quizId) => {
  try {
    const resultsRef = ref(database, `liveQuizResults/${courseId}/${quizId}`);
    const resultsSnapshot = await get(resultsRef);

    if (resultsSnapshot.exists()) {
      return resultsSnapshot.val();
    }

    return {};
  } catch (error) {
    console.error("Erro ao buscar resultados de live quiz:", error);
    return {};
  }
};

/**
 * Processa os resultados do quiz personalizado para exibição
 * @param {object} correctAnswers - Respostas corretas do quiz personalizado
 * @returns {object} - Resultados processados para exibição
 */
export const processCustomQuizResults = (correctAnswers) => {
  if (!correctAnswers) return {};

  // Se tiver estrutura aninhada, processar
  if (
    Object.values(correctAnswers).some(
      (value) => typeof value === "object" && !Array.isArray(value)
    )
  ) {
    const processedResults = {};

    Object.entries(correctAnswers).forEach(([userId, answers]) => {
      if (typeof answers === "object" && !Array.isArray(answers)) {
        // Para cada resposta do usuário, criar uma entrada única
        Object.entries(answers).forEach(([answerId, answer]) => {
          processedResults[`${userId}-${answerId}`] = answer;
        });
      } else {
        // Caso seja um formato mais simples, usar diretamente
        processedResults[userId] = answers;
      }
    });

    return processedResults;
  }

  return correctAnswers;
};

/**
 * Gera o ranking dos alunos baseado nos resultados do quiz
 * @param {object} quizResults - Resultados do quiz normal
 * @param {object} customQuestionResults - Resultados do quiz personalizado
 * @returns {Array} - Ranking ordenado dos alunos
 */
export const generateQuizRanking = (quizResults, customQuestionResults) => {
  const contadorAlunos = {};

  // Processar resultados do Live Quiz (questões normais)
  if (quizResults) {
    Object.entries(quizResults).forEach(([questionId, questionData]) => {
      if (questionData && questionData.correctAnswers) {
        Object.entries(questionData.correctAnswers).forEach(
          ([userId, answerData]) => {
            if (!contadorAlunos[userId]) {
              contadorAlunos[userId] = {
                id: userId,
                nome:
                  answerData.studentName ||
                  answerData.name ||
                  "Aluno " + userId.slice(0, 5),
                photoURL: answerData.photoURL || null,
                avatar: (
                  answerData.studentName ||
                  answerData.name ||
                  "?"
                ).charAt(0),
                acertosLive: 1,
                acertosCustom: 0,
                acertosTotal: 1,
              };
            } else {
              contadorAlunos[userId].acertosLive += 1;
              contadorAlunos[userId].acertosTotal =
                contadorAlunos[userId].acertosLive +
                contadorAlunos[userId].acertosCustom;
            }
          }
        );
      }
    });
  }

  // Processar resultados de perguntas personalizadas
  if (customQuestionResults && customQuestionResults.correctAnswers) {
    Object.entries(customQuestionResults.correctAnswers).forEach(
      ([userId, answers]) => {
        if (typeof answers === "object" && !Array.isArray(answers)) {
          let acertosCustom = 0;
          let nome = null;
          let photoURL = null;

          Object.values(answers).forEach((answer) => {
            acertosCustom++;
            if (!nome && answer.studentName) {
              nome = answer.studentName;
            }
            if (!photoURL && answer.photoURL) {
              photoURL = answer.photoURL;
            }
          });

          if (nome && acertosCustom > 0) {
            if (!contadorAlunos[userId]) {
              contadorAlunos[userId] = {
                id: userId,
                nome: nome,
                photoURL: photoURL,
                avatar: nome ? nome.charAt(0) : "?",
                acertosLive: 0,
                acertosCustom: acertosCustom,
                acertosTotal: acertosCustom,
              };
            } else {
              contadorAlunos[userId].acertosCustom = acertosCustom;
              contadorAlunos[userId].acertosTotal =
                contadorAlunos[userId].acertosLive + acertosCustom;
              if (!contadorAlunos[userId].nome && nome) {
                contadorAlunos[userId].nome = nome;
              }
              if (!contadorAlunos[userId].photoURL && photoURL) {
                contadorAlunos[userId].photoURL = photoURL;
              }
            }
          }
        }
      }
    );
  }

  // Converter para array e ordenar
  return Object.values(contadorAlunos).sort(
    (a, b) => b.acertosTotal - a.acertosTotal
  );
};

/**
 * Processa resultados de quiz específicos para o ranking personalizado
 * @param {object} customResults - Resultados de quiz personalizado
 * @param {object} liveQuizResults - Resultados de quiz ao vivo
 * @returns {Array} - Ranking processado de participantes
 */
export const processCustomQuizRanking = (
  customResults,
  liveQuizResults = {}
) => {
  const contadorAlunos = {};

  if (customResults && customResults.correctAnswers) {
    Object.entries(customResults.correctAnswers).forEach(
      ([userId, answers]) => {
        if (typeof answers === "object" && !Array.isArray(answers)) {
          let acertos = 0;
          let nome = null;
          let photoURL = null;

          Object.values(answers).forEach((answer) => {
            acertos++;
            if (!nome && answer.studentName) {
              nome = answer.studentName;
            }
            if (!photoURL && answer.photoURL) {
              photoURL = answer.photoURL;
            }
          });

          if (nome && acertos > 0) {
            contadorAlunos[userId] = {
              id: userId,
              nome: nome,
              photoURL: photoURL,
              avatar: nome ? nome.charAt(0) : "?",
              acertosCustom: acertos,
              acertosLive: 0,
              acertosTotal: acertos,
            };
          }
        }
      }
    );
  }

  // Processar resultados do Live Quiz
  if (liveQuizResults) {
    // Verificar se é formato de questionId ou formato de userId
    const isQuestionFormat = Object.values(liveQuizResults).some(
      (val) => val && typeof val === "object" && val.correctAnswers
    );

    if (isQuestionFormat) {
      // Formato organizado por questionId (estrutura do QuizGigi)
      Object.entries(liveQuizResults).forEach(([questionId, questionData]) => {
        if (questionData && questionData.correctAnswers) {
          Object.entries(questionData.correctAnswers).forEach(
            ([userId, answerData]) => {
              if (contadorAlunos[userId]) {
                contadorAlunos[userId].acertosLive += 1;
                contadorAlunos[userId].acertosTotal =
                  contadorAlunos[userId].acertosCustom +
                  contadorAlunos[userId].acertosLive;
              } else {
                contadorAlunos[userId] = {
                  id: userId,
                  nome: answerData.studentName || "Aluno " + userId.slice(0, 5),
                  photoURL: answerData.photoURL || null,
                  avatar: answerData.studentName
                    ? answerData.studentName.charAt(0)
                    : "?",
                  acertosCustom: 0,
                  acertosLive: 1,
                  acertosTotal: 1,
                };
              }
            }
          );
        }
      });
    } else {
      // Formato organizado por userId (estrutura do Firebase)
      Object.entries(liveQuizResults).forEach(([userId, data]) => {
        const correctAnswers = data.correctAnswers || 0;

        if (correctAnswers > 0) {
          if (contadorAlunos[userId]) {
            contadorAlunos[userId].acertosLive = correctAnswers;
            contadorAlunos[userId].acertosTotal =
              contadorAlunos[userId].acertosCustom + correctAnswers;
          } else {
            contadorAlunos[userId] = {
              id: userId,
              nome: data.studentName || "Aluno " + userId.slice(0, 5),
              photoURL: data.photoURL || null,
              avatar: data.studentName ? data.studentName.charAt(0) : "?",
              acertosCustom: 0,
              acertosLive: correctAnswers,
              acertosTotal: correctAnswers,
            };
          }
        }
      });
    }
  }

  // Converter para array e ordenar por total de acertos
  const participantes = Object.values(contadorAlunos);
  return participantes.sort((a, b) => b.acertosTotal - a.acertosTotal);
};
