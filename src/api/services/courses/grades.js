import { database } from '$api/config/firebase';
import { ref, get } from 'firebase/database';
import { computeStudentGradeSummary } from './gradeSummary';

// O cálculo e a formatação das notas vivem em `gradeSummary.js`, sem dependência
// do Firebase. Reexportados aqui para que os consumidores continuem importando
// tudo de um lugar só.
export * from './gradeSummary';

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
    const assessments = Object.entries(assessmentsData).map(([id, assessment]) => ({
      id,
      ...assessment,
    }));

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

          // Coletar as notas deste estudante e calcular seu resumo
          const studentGrades = {};
          assessments.forEach((assessment) => {
            const recorded = assessment.grades?.[userId];
            if (recorded) {
              studentGrades[assessment.id] = recorded;
            }
          });

          studentsGrades.push({
            userId,
            name: studentName,
            email: userData.email || "Email não disponível",
            photoURL: userData.photoURL || "",
            ...computeStudentGradeSummary(studentGrades, assessments),
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
