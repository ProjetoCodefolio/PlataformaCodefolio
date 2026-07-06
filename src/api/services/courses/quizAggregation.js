import { database } from "../../config/firebase";
import { ref, get } from "firebase/database";
import { normalizeDiagnosticFlag } from "./quizzes";

/**
 * Busca todos os quizzes de um curso (vídeos e slides)
 * @param {string} courseId - ID do curso
 * @returns {Promise<Array>} - Lista de quizzes do curso
 */
export const fetchAllCourseQuizzes = async (courseId) => {
  try {
    const quizzesRef = ref(database, `courseQuizzes/${courseId}`);
    const snapshot = await get(quizzesRef);

    if (!snapshot.exists()) {
      return [];
    }

    const quizzesData = snapshot.val();
    const quizzes = [];

    Object.entries(quizzesData).forEach(([quizId, quizData]) => {
      quizzes.push({
        id: quizId,
        videoId: quizData.videoId || quizId,
        minPercentage: quizData.minPercentage || 0,
        isDiagnostic: normalizeDiagnosticFlag(quizData.isDiagnostic),
        questions: quizData.questions || [],
        isSlideQuiz: quizId.startsWith("slide_"),
      });
    });

    return quizzes;
  } catch (error) {
    console.error("Erro ao buscar quizzes do curso:", error);
    return [];
  }
};

/**
 * Busca resultados de quiz regular para um estudante
 * @param {string} userId - ID do estudante
 * @param {string} courseId - ID do curso
 * @param {string} quizId - ID do quiz
 * @returns {Promise<Object|null>} - Resultado do quiz ou null
 */
const fetchRegularQuizResult = async (userId, courseId, quizId) => {
  try {
    const resultRef = ref(database, `quizResults/${userId}/${courseId}/${quizId}`);
    const snapshot = await get(resultRef);

    if (!snapshot.exists()) {
      return null;
    }

    return snapshot.val();
  } catch (error) {
    console.error(`Erro ao buscar resultado regular do quiz ${quizId}:`, error);
    return null;
  }
};

/**
 * Busca resultados de live quiz para um estudante
 * @param {string} userId - ID do estudante
 * @param {string} courseId - ID do curso
 * @param {string} quizId - ID do quiz
 * @param {number} totalQuestions - Total de questões do quiz
 * @returns {Promise<Object>} - Resultado do live quiz
 */
const fetchLiveQuizResult = async (userId, courseId, quizId, totalQuestions) => {
  try {
    // Live quiz tem dois formatos possíveis:
    // 1. Formato por questão: liveQuizResults/{courseId}/{quizId}/{questionId}/correctAnswers/{userId}
    // 2. Formato por usuário: liveQuizResults/{courseId}/{quizId}/{userId}
    
    // Primeiro, tentar buscar formato por usuário (mais direto)
    const userResultRef = ref(database, `liveQuizResults/${courseId}/${quizId}/${userId}`);
    const userSnapshot = await get(userResultRef);
    
    if (userSnapshot.exists()) {
      const userData = userSnapshot.val();
      return { 
        correctAnswers: userData.correctAnswers || 0, 
        totalQuestions,
        wrongAnswers: userData.wrongAnswers || 0,
      };
    }
    
    // Se não existe formato por usuário, buscar formato por questão
    const liveResultsRef = ref(database, `liveQuizResults/${courseId}/${quizId}`);
    const snapshot = await get(liveResultsRef);

    if (!snapshot.exists()) {
      return { correctAnswers: 0, totalQuestions, wrongAnswers: 0 };
    }

    const liveResults = snapshot.val();
    let correctAnswers = 0;
    let wrongAnswers = 0;

    // Contar acertos e erros do estudante em cada questão
    Object.values(liveResults).forEach((questionData) => {
      if (questionData && typeof questionData === 'object') {
        // Verificar se o userId está nos acertos
        if (questionData.correctAnswers && questionData.correctAnswers[userId]) {
          correctAnswers++;
        }
        // Verificar se o userId está nos erros
        if (questionData.wrongAnswers && questionData.wrongAnswers[userId]) {
          wrongAnswers++;
        }
      }
    });

    return { correctAnswers, wrongAnswers, totalQuestions };
  } catch (error) {
    console.error(`Erro ao buscar live quiz ${quizId}:`, error);
    return { correctAnswers: 0, wrongAnswers: 0, totalQuestions };
  }
};

/**
 * Busca resultados de custom quiz para um estudante
 * @param {string} userId - ID do estudante
 * @param {string} courseId - ID do curso
 * @param {string} quizId - ID do quiz
 * @returns {Promise<Object>} - Resultado do custom quiz
 */
const fetchCustomQuizResult = async (userId, courseId, quizId) => {
  try {
    const customResultsRef = ref(database, `customQuizResults/${courseId}/${quizId}/${userId}`);
    const snapshot = await get(customResultsRef);

    if (!snapshot.exists()) {
      return { correctAnswers: 0 };
    }

    const customData = snapshot.val();
    
    // Custom quiz pode ter estrutura aninhada (um objeto para cada pergunta personalizada)
    // Contar quantas perguntas personalizadas o aluno acertou
    let correctAnswers = 0;
    
    if (typeof customData === 'object') {
      // Se for objeto, pode ser estrutura aninhada de respostas personalizadas
      if (customData.correctAnswers !== undefined && typeof customData.correctAnswers === 'number') {
        // Formato direto com contador
        correctAnswers = customData.correctAnswers;
      } else {
        // Formato com múltiplas respostas personalizadas (cada key é uma pergunta)
        correctAnswers = Object.keys(customData).length;
      }
    }

    return {
      correctAnswers,
      timesDraw: customData.timesDraw || 0,
    };
  } catch (error) {
    console.error(`Erro ao buscar custom quiz ${quizId}:`, error);
    return { correctAnswers: 0 };
  }
};

/**
 * Calcula a nota de um quiz para um estudante
 * @param {Object} quiz - Dados do quiz
 * @param {string} userId - ID do estudante
 * @param {string} courseId - ID do curso
 * @returns {Promise<Object>} - Nota calculada e detalhes
 */
const calculateQuizGrade = async (quiz, userId, courseId) => {
  // Filtrar apenas questões de múltipla escolha para o cálculo da nota
  const multipleChoiceQuestions = quiz.questions.filter(
    q => q.questionType !== 'open-ended'
  );
  const openEndedQuestions = quiz.questions.filter(
    q => q.questionType === 'open-ended'
  );
  
  const totalQuestions = multipleChoiceQuestions.length; // Apenas múltipla escolha
  const totalOpenEnded = openEndedQuestions.length;
  
  // Buscar resultados de todos os tipos de quiz
  const [regularResult, liveResult, customResult] = await Promise.all([
    fetchRegularQuizResult(userId, courseId, quiz.id),
    fetchLiveQuizResult(userId, courseId, quiz.id, totalQuestions),
    fetchCustomQuizResult(userId, courseId, quiz.id),
  ]);

  const regularCorrect = regularResult ? regularResult.correctAnswers || 0 : 0;
  const liveCorrect = liveResult.correctAnswers || 0;
  const customCorrect = customResult.correctAnswers || 0;

  // NOTA BASE: Quiz Regular (sobre o total de questões)
  const basePercentage = totalQuestions > 0 ? (regularCorrect / totalQuestions) * 100 : 0;
  
  // PONTOS EXTRAS: Live Quiz e Custom Quiz (cada questão vale pontos extras)
  // Considerando que cada questão extra vale uma porcentagem adicional
  const liveBonus = totalQuestions > 0 ? (liveCorrect / totalQuestions) * 100 : 0;
  const customBonus = totalQuestions > 0 ? (customCorrect / totalQuestions) * 100 : 0;
  
  // TOTAL: Base + Bônus (pode passar de 100%)
  const totalPercentage = basePercentage + liveBonus + customBonus;
  
  // Nota de 0-10 (pode passar de 10 se tiver muito bônus)
  const grade = totalPercentage / 10;

  // Total de questões corretas (soma de todos os tipos)
  const totalCorrect = regularCorrect + liveCorrect + customCorrect;
  
  // Considera que tem tentativa se fez qualquer um dos tipos
  const hasAttempt = regularCorrect > 0 || liveCorrect > 0 || customCorrect > 0;

  // Para verificar se passou, usa apenas a nota base (quiz regular)
  const passedRegular = basePercentage >= quiz.minPercentage;
  
  // Mas a nota total considera os bônus
  const passedWithBonus = totalPercentage >= quiz.minPercentage;

  return {
    quizId: quiz.id,
    quizName: quiz.videoId,
    isSlideQuiz: quiz.isSlideQuiz,
    isDiagnostic: normalizeDiagnosticFlag(quiz.isDiagnostic),
    totalQuestions, // Apenas questões de múltipla escolha
    totalOpenEnded, // Número de questões abertas (apenas informativo)
    totalCorrect,
    basePercentage: Math.round(basePercentage * 10) / 10,
    totalPercentage: Math.round(totalPercentage * 10) / 10,
    bonusPercentage: Math.round((liveBonus + customBonus) * 10) / 10,
    percentage: Math.round(totalPercentage * 10) / 10, // Mantém compatibilidade
    grade: Math.round(grade * 100) / 100,
    minPercentage: quiz.minPercentage,
    passed: passedWithBonus, // Passou considerando bônus
    passedBase: passedRegular, // Passou apenas com quiz regular
    hasAttempt,
    hasBonus: liveCorrect > 0 || customCorrect > 0,
    details: {
      regular: regularCorrect,
      live: liveCorrect,
      custom: customCorrect,
      liveWrong: liveResult.wrongAnswers || 0,
    },
  };
};

/**
 * Busca notas agregadas de todos os quizzes de um curso para todos os estudantes
 * @param {string} courseId - ID do curso
 * @returns {Promise<Object>} - Dados agregados por estudante
 */
export const fetchAggregatedQuizGrades = async (courseId) => {
  try {
    // Buscar todos os quizzes do curso
    const quizzes = await fetchAllCourseQuizzes(courseId);

    if (quizzes.length === 0) {
      return { students: [], quizzes: [], summary: {}, videoNames: {}, slideNames: {} };
    }

    // Buscar nomes dos vídeos, slides e da nova collection de conteúdo
    const videosRef = ref(database, `courseVideos/${courseId}`);
    const slidesRef = ref(database, `courseSlides/${courseId}`);
    const contentRef = ref(database, `courseContent/${courseId}`);

    const [videosSnapshot, slidesSnapshot, contentSnapshot] = await Promise.all([
      get(videosRef),
      get(slidesRef),
      get(contentRef)
    ]);

    const videoNames = {};
    const slideNames = {};

    // Mapear IDs para nomes dos vídeos
    if (videosSnapshot.exists()) {
      const videosData = videosSnapshot.val();
      Object.entries(videosData).forEach(([videoId, videoData]) => {
        videoNames[videoId] = videoData.title || videoData.videoTitle || `Vídeo ${videoId.substring(0, 8)}`;
      });
    }

    // Itens da nova collection unificada (vídeos e slides) têm quiz chaveado
    // pelo id puro (sem prefixo), então entram no mapa de videoNames.
    if (contentSnapshot.exists()) {
      const contentData = contentSnapshot.val();
      Object.entries(contentData).forEach(([contentId, item]) => {
        if (item && typeof item === "object") {
          videoNames[contentId] =
            item.title || `Conteúdo ${contentId.substring(0, 8)}`;
        }
      });
    }

    // Mapear IDs para nomes dos slides
    if (slidesSnapshot.exists()) {
      const slidesData = slidesSnapshot.val();
      Object.entries(slidesData).forEach(([slideId, slideData]) => {
        slideNames[slideId] = slideData.title || `Slide ${slideId.substring(0, 8)}`;
      });
    }

    // Buscar estudantes matriculados
    const studentCoursesRef = ref(database, "studentCourses");
    const studentCoursesSnapshot = await get(studentCoursesRef);

    if (!studentCoursesSnapshot.exists()) {
      return { students: [], quizzes, summary: {} };
    }

    const studentCoursesData = studentCoursesSnapshot.val();
    const enrolledStudents = [];

    // Filtrar estudantes matriculados neste curso
    for (const userId in studentCoursesData) {
      if (studentCoursesData[userId][courseId]) {
        enrolledStudents.push(userId);
      }
    }

    // Buscar informações dos usuários
    const usersRef = ref(database, "users");
    const usersSnapshot = await get(usersRef);
    const usersData = usersSnapshot.exists() ? usersSnapshot.val() : {};

    // Calcular notas para cada estudante
    const studentsGrades = await Promise.all(
      enrolledStudents.map(async (userId) => {
        const userData = usersData[userId] || {};
        
        // Calcular notas de todos os quizzes
        const quizGrades = await Promise.all(
          quizzes.map((quiz) => calculateQuizGrade(quiz, userId, courseId))
        );

        // Separar quizzes diagnósticos dos avaliativos
        const diagnosticQuizzes = quizGrades.filter((q) => q.isDiagnostic);
        const evaluativeQuizzes = quizGrades.filter((q) => !q.isDiagnostic);

        // Calcular média apenas dos quizzes avaliativos
        const totalEvaluative = evaluativeQuizzes.length;
        const sumEvaluative = evaluativeQuizzes.reduce((sum, q) => sum + q.grade, 0);
        const averageGrade = totalEvaluative > 0 ? sumEvaluative / totalEvaluative : 0;

        // Calcular estatísticas
        const attemptedQuizzes = quizGrades.filter((q) => q.hasAttempt).length;
        const passedQuizzes = evaluativeQuizzes.filter((q) => q.passed).length;

        return {
          userId,
          name: userData.displayName || `${userData.firstName || ""} ${userData.lastName || ""}`.trim() || userData.email?.split("@")[0] || "Usuário Desconhecido",
          email: userData.email || "",
          photoURL: userData.photoURL || "",
          quizGrades,
          diagnosticQuizzes,
          evaluativeQuizzes,
          averageGrade: Math.round(averageGrade * 100) / 100,
          attemptedQuizzes,
          passedQuizzes,
          totalQuizzes: quizzes.length,
          totalEvaluative,
          completionRate: quizzes.length > 0 
            ? Math.round((attemptedQuizzes / quizzes.length) * 100) 
            : 0,
        };
      })
    );

    // Calcular resumo geral
    const summary = {
      totalStudents: studentsGrades.length,
      totalQuizzes: quizzes.length,
      totalEvaluativeQuizzes: quizzes.filter((q) => !q.isDiagnostic).length,
      totalDiagnosticQuizzes: quizzes.filter((q) => q.isDiagnostic).length,
      averageClassGrade: studentsGrades.length > 0
        ? Math.round((studentsGrades.reduce((sum, s) => sum + s.averageGrade, 0) / studentsGrades.length) * 100) / 100
        : 0,
      studentsWithAllQuizzes: studentsGrades.filter(
        (s) => s.attemptedQuizzes === quizzes.length
      ).length,
    };

    return {
      students: studentsGrades,
      quizzes,
      summary,
      videoNames,
      slideNames,
    };
  } catch (error) {
    console.error("Erro ao buscar notas agregadas:", error);
    throw error;
  }
};

/**
 * Exporta notas agregadas para CSV
 * @param {Array} students - Lista de estudantes com notas
 * @param {Array} quizzes - Lista de quizzes
 * @param {Object} videoNames - Mapa de IDs para nomes de vídeos
 * @param {Object} slideNames - Mapa de IDs para nomes de slides
 * @returns {string} - Conteúdo CSV
 */
export const exportQuizGradesToCSV = (students, quizzes, videoNames = {}, slideNames = {}) => {
  // Função helper para obter nome do quiz
  const getQuizName = (quiz) => {
    if (quiz.isSlideQuiz) {
      const slideId = quiz.id.replace("slide_", "");
      return slideNames[slideId] || quiz.videoId || quiz.id;
    } else {
      return videoNames[quiz.id] || videoNames[quiz.videoId] || quiz.videoId || quiz.id;
    }
  };

  // Headers dinâmicos baseados nos quizzes
  const quizHeaders = [];
  quizzes.forEach((quiz) => {
    const quizName = getQuizName(quiz);
    const prefix = quiz.isDiagnostic ? "📋 " : "";
    const type = quiz.isSlideQuiz ? " [Slide]" : " [Vídeo]";
    
    // Informar sobre questões abertas no cabeçalho
    const multipleChoiceCount = quiz.questions.filter(q => q.questionType !== 'open-ended').length;
    const openEndedCount = quiz.questions.filter(q => q.questionType === 'open-ended').length;
    const questionInfo = openEndedCount > 0 
      ? ` (${multipleChoiceCount} múltipla escolha, ${openEndedCount} aberta${openEndedCount > 1 ? 's' : ''})`
      : ` (${multipleChoiceCount} questões)`;
    
    quizHeaders.push(`${prefix}${quizName}${type}${questionInfo} - Nota Final`);
    quizHeaders.push(`${prefix}${quizName}${type} - Regular`);
    quizHeaders.push(`${prefix}${quizName}${type} - Live Bonus`);
    quizHeaders.push(`${prefix}${quizName}${type} - Custom Bonus`);
  });

  const headers = [
    "Nome do Estudante",
    "Email",
    ...quizHeaders,
    "Média Geral do Curso",
    "Quizzes Realizados",
    "Quizzes Aprovados",
    "Taxa de Conclusão (%)",
  ];

  const rows = students.map((student) => {
    const quizDetails = [];
    
    quizzes.forEach((quiz) => {
      const gradeData = student.quizGrades.find((g) => g.quizId === quiz.id);
      
      if (gradeData && gradeData.hasAttempt) {
        // Nota final
        quizDetails.push(gradeData.grade.toFixed(2));
        
        // Detalhes por tipo
        quizDetails.push(gradeData.details.regular || 0);
        quizDetails.push(gradeData.details.live || 0);
        quizDetails.push(gradeData.details.custom || 0);
      } else {
        // Não realizou
        quizDetails.push("-");
        quizDetails.push("0");
        quizDetails.push("0");
        quizDetails.push("0");
      }
    });

    return [
      student.name,
      student.email,
      ...quizDetails,
      student.averageGrade.toFixed(2),
      `${student.attemptedQuizzes}/${student.totalQuizzes}`,
      `${student.passedQuizzes}/${student.totalEvaluative}`,
      student.completionRate,
    ];
  });

  // Adicionar linha de resumo
  const summaryRow = [
    "RESUMO DA TURMA",
    "",
    ...Array(quizHeaders.length).fill(""),
    students.length > 0 
      ? (students.reduce((sum, s) => sum + s.averageGrade, 0) / students.length).toFixed(2)
      : "0.00",
    "",
    "",
    students.length > 0
      ? Math.round((students.reduce((sum, s) => sum + s.completionRate, 0) / students.length))
      : 0,
  ];

  const allRows = [headers, ...rows, summaryRow];
  
  const csvContent = allRows
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");

  return csvContent;
};
