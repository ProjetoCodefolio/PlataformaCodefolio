import { database } from '$api/config/firebase';
import { ref, get } from 'firebase/database';
import {
  MINIMUM_PASSING_GRADE,
  MAXIMUM_GRADE,
  GRADE_STATUS,
  GRADE_COLORS,
} from '$api/constants/gradeConstants';

/**
 * Busca todas as notas de um estudante em um curso
 * @param {string} courseId - ID do curso
 * @param {string} studentId - ID do estudante
 * @returns {Promise<Object>} - Notas do estudante por avaliação
 */
export const fetchStudentGrades = async (courseId, studentId) => {
  if (!courseId || !studentId) return {};
  
  try {
    const assessmentsRef = ref(database, `courseAssessments/${courseId}`);
    const snapshot = await get(assessmentsRef);
    
    if (!snapshot.exists()) return {};
    
    const assessmentsData = snapshot.val();
    const grades = {};
    
    Object.entries(assessmentsData).forEach(([assessmentId, assessment]) => {
      if (assessment.grades && assessment.grades[studentId]) {
        grades[assessmentId] = {
          assessmentName: assessment.name,
          percentage: assessment.percentage,
          grade: assessment.grades[studentId].grade,
          assignedAt: assessment.grades[studentId].assignedAt
        };
      }
    });
    
    return grades;
  } catch (error) {
    console.error("Erro ao buscar notas do estudante:", error);
    return {};
  }
};

/**
 * Busca todas as notas de todos os estudantes de um curso
 * @param {string} courseId - ID do curso
 * @returns {Promise<Array>} - Lista de estudantes com suas notas
 */
export const fetchAllCourseGrades = async (courseId) => {
  if (!courseId) return [];
  
  try {
    // Buscar avaliações do curso
    const assessmentsRef = ref(database, `courseAssessments/${courseId}`);
    const assessmentsSnapshot = await get(assessmentsRef);
    
    if (!assessmentsSnapshot.exists()) {
      return [];
    }
    
    const assessmentsData = assessmentsSnapshot.val();
    
    // Buscar estudantes matriculados
    const studentCoursesRef = ref(database, `studentCourses`);
    const studentCoursesSnapshot = await get(studentCoursesRef);
    
    if (!studentCoursesSnapshot.exists()) {
      return [];
    }
    
    const studentCoursesData = studentCoursesSnapshot.val();
    const studentsGrades = [];
    
    // Para cada estudante matriculado no curso
    for (const [userId, courses] of Object.entries(studentCoursesData)) {
      if (courses[courseId]) {
        // Buscar dados do usuário
        const userRef = ref(database, `users/${userId}`);
        const userSnapshot = await get(userRef);
        
        if (userSnapshot.exists()) {
          const userData = userSnapshot.val();
          
          // Montar nome do estudante
          let studentName = "Usuário Desconhecido";
          if (userData.displayName) {
            studentName = userData.displayName;
          } else if (userData.firstName) {
            studentName = `${userData.firstName} ${userData.lastName || ""}`.trim();
          } else if (userData.name) {
            studentName = userData.name;
          } else if (userData.email) {
            studentName = userData.email.split("@")[0];
          }
          
          // Coletar notas do estudante em cada avaliação
          const grades = {};
          let totalWeighted = 0;
          let totalPercentage = 0;
          let hasMissingGrades = false;
          let hasAnyGradeRecorded = false; // Verificar se tem alguma nota lançada
          let allGradesAreZero = true; // Verificar se todas as notas são 0
          
          Object.entries(assessmentsData).forEach(([assessmentId, assessment]) => {
            const percentage = Number(assessment.percentage) || 0;
            totalPercentage += percentage;
            
            if (assessment.grades && assessment.grades[userId]) {
              const grade = Number(assessment.grades[userId].grade) || 0;
              const weightedGrade = (grade * percentage) / 10;
              
              grades[assessmentId] = {
                assessmentName: assessment.name,
                percentage: percentage,
                grade: grade,
                weightedGrade: weightedGrade,
                assignedAt: assessment.grades[userId].assignedAt
              };
              
              totalWeighted += weightedGrade;
              hasAnyGradeRecorded = true;
              
              // Se alguma nota for diferente de 0, não é "todas zeradas"
              if (grade !== 0) {
                allGradesAreZero = false;
              }
            } else {
              // Nota faltando
              hasMissingGrades = true;
              grades[assessmentId] = {
                assessmentName: assessment.name,
                percentage: percentage,
                grade: null,
                weightedGrade: 0,
                assignedAt: null
              };
            }
          });
          
          // Calcular nota final
          const finalGrade = totalPercentage > 0 
            ? (totalWeighted * MAXIMUM_GRADE) / totalPercentage 
            : 0;
          
          // Determinar status considerando se há notas lançadas
          const status = determineStudentStatus(
            finalGrade,
            hasMissingGrades,
            hasAnyGradeRecorded,
            allGradesAreZero
          );
          
          studentsGrades.push({
            userId,
            name: studentName,
            email: userData.email || "Email não disponível",
            photoURL: userData.photoURL || "",
            grades,
            totalWeighted,
            totalPercentage,
            finalGrade,
            status,
            hasMissingGrades,
            hasAnyGradeRecorded,
            allGradesAreZero
          });
        }
      }
    }
    
    return studentsGrades;
  } catch (error) {
    console.error("Erro ao buscar notas do curso:", error);
    throw error;
  }
};

/**
 * Determina o status do estudante baseado na nota final
 * @param {number} finalGrade - Nota final do estudante
 * @param {boolean} hasMissingGrades - Se tem notas faltando
 * @param {boolean} hasAnyGradeRecorded - Se tem alguma nota lançada
 * @param {boolean} allGradesAreZero - Se todas as notas lançadas são 0
 * @returns {string} - Status (pending, approved, failed)
 */
export const determineStudentStatus = (
  finalGrade,
  hasMissingGrades,
  hasAnyGradeRecorded = false,
  allGradesAreZero = true
) => {
  // Se não tem nenhuma nota lançada (nem parcial), é pendente
  if (!hasAnyGradeRecorded) {
    return GRADE_STATUS.PENDING;
  }
  
  // Se tem notas faltando, é pendente
  if (hasMissingGrades) {
    return GRADE_STATUS.PENDING;
  }
  
  // Se tem todas as notas e nota final >= MINIMUM_PASSING_GRADE, é aprovado
  if (finalGrade >= MINIMUM_PASSING_GRADE) {
    return GRADE_STATUS.APPROVED;
  }
  
  // Se tem todas as notas e nota final < MINIMUM_PASSING_GRADE, é reprovado
  return GRADE_STATUS.FAILED;
};

/**
 * Calcula estatísticas das notas do curso
 * @param {Array} studentsGrades - Lista de notas dos estudantes
 * @returns {Object} - Estatísticas calculadas
 */
export const calculateGradeStatistics = (studentsGrades) => {
  if (!studentsGrades || studentsGrades.length === 0) {
    return {
      average: 0,
      highest: 0,
      lowest: 0,
      approvedCount: 0,
      failedCount: 0,
      pendingCount: 0,
      totalStudents: 0
    };
  }
  
  const totalStudents = studentsGrades.length;
  
  // Filtrar apenas estudantes com todas as notas (sem pendências e com pelo menos uma nota lançada)
  const completeGrades = studentsGrades
    .filter(s => !s.hasMissingGrades && s.hasAnyGradeRecorded)
    .map(s => s.finalGrade)
    .filter(g => g !== null && g !== undefined);
  
  // Contar por status
  const approvedCount = studentsGrades.filter(s => s.status === GRADE_STATUS.APPROVED).length;
  const failedCount = studentsGrades.filter(s => s.status === GRADE_STATUS.FAILED).length;
  const pendingCount = studentsGrades.filter(s => s.status === GRADE_STATUS.PENDING).length;
  
  // Calcular estatísticas
  let average = 0;
  let highest = 0;
  let lowest = MAXIMUM_GRADE;
  
  if (completeGrades.length > 0) {
    const sum = completeGrades.reduce((acc, g) => acc + g, 0);
    average = sum / completeGrades.length;
    highest = Math.max(...completeGrades);
    lowest = Math.min(...completeGrades);
  }
  
  return {
    average,
    highest,
    lowest,
    approvedCount,
    failedCount,
    pendingCount,
    totalStudents
  };
};

/**
 * Exporta as notas para CSV
 * @param {Array} studentsGrades - Lista de notas dos estudantes
 * @param {Array} assessments - Lista de avaliações
 * @returns {string} - Conteúdo CSV
 */
export const exportGradesToCSV = (studentsGrades, assessments) => {
  if (!studentsGrades || studentsGrades.length === 0) return "";
  
  // Cabeçalho
  let csv = "Nome,Email,Status";
  assessments.forEach(assessment => {
    csv += `,${assessment.name} (${assessment.percentage}%)`;
  });
  csv += ",Nota Final\n";
  
  // Linhas de dados
  studentsGrades.forEach(student => {
    csv += `${student.name},${student.email},${translateStatus(student.status)}`;
    assessments.forEach(assessment => {
      const grade = student.grades[assessment.id];
      csv += `,${grade && grade.grade !== null ? grade.grade.toFixed(2) : ""}`;
    });
    csv += `,${student.finalGrade.toFixed(2)}\n`;
  });
  
  return csv;
};

/**
 * Traduz o status para português
 * @param {string} status - Status em inglês
 * @returns {string} - Status em português
 */
export const translateStatus = (status) => {
  const translations = {
    [GRADE_STATUS.PENDING]: "Pendente",
    [GRADE_STATUS.APPROVED]: "Aprovado",
    [GRADE_STATUS.FAILED]: "Reprovado"
  };
  return translations[status] || status;
};

/**
 * Ordena e filtra as notas dos estudantes
 * @param {Array} studentsGrades - Lista de notas dos estudantes
 * @param {string} sortField - Campo a ordenar
 * @param {string} sortOrder - 'asc' ou 'desc'
 * @returns {Array} - Lista ordenada
 */
export const sortStudentsGrades = (studentsGrades, sortField = "name", sortOrder = "asc") => {
  if (!studentsGrades || studentsGrades.length === 0) return [];

  const sorted = [...studentsGrades].sort((a, b) => {
    let valueA, valueB;

    switch (sortField) {
      case "name":
        valueA = (a.name || "").toLowerCase();
        valueB = (b.name || "").toLowerCase();
        return sortOrder === "asc"
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA);

      case "email":
        valueA = (a.email || "").toLowerCase();
        valueB = (b.email || "").toLowerCase();
        return sortOrder === "asc"
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA);

      case "finalGrade":
        valueA = Number(a.finalGrade) || 0;
        valueB = Number(b.finalGrade) || 0;
        return sortOrder === "asc" ? valueA - valueB : valueB - valueA;

      case "totalPercentage":
        valueA = Number(a.totalPercentage) || 0;
        valueB = Number(b.totalPercentage) || 0;
        return sortOrder === "asc" ? valueA - valueB : valueB - valueA;

      default:
        return 0;
    }
  });

  return sorted;
};

/**
 * Determina a cor da nota final
 * @param {number} grade - Nota
 * @param {boolean} hasAnyGradeRecorded - Se tem alguma nota lançada
 * @returns {string} - Cor em formato hex
 */
export const getGradeColor = (grade, hasAnyGradeRecorded = true) => {
  // Se nota é 0 e não tem nenhuma nota lançada, cinza (pendente)
  if (grade === 0 && !hasAnyGradeRecorded) {
    return GRADE_COLORS.PENDING;
  }
  
  if (grade >= 9) return GRADE_COLORS.EXCELLENT;
  if (grade >= MINIMUM_PASSING_GRADE + 1) return GRADE_COLORS.GOOD;
  if (grade >= MINIMUM_PASSING_GRADE) return GRADE_COLORS.FAIR;
  if (grade > 0) return GRADE_COLORS.POOR;
  
  // Se chegou aqui, é 0 com notas lançadas = reprovado (vermelho)
  return GRADE_COLORS.POOR;
};

/**
 * Determina a cor de uma nota individual (acima/abaixo da média)
 * @param {number} grade - Nota
 * @returns {string} - Cor em formato hex
 */
export const getGradeDifferentialColor = (grade) => {
  if (grade === null || grade === undefined) return GRADE_COLORS.PENDING;
  if (grade > MINIMUM_PASSING_GRADE) return GRADE_COLORS.GOOD;
  if (grade < MINIMUM_PASSING_GRADE) return GRADE_COLORS.POOR;
  return GRADE_COLORS.FAIR;
};
