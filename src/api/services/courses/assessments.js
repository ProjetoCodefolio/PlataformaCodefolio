import { database } from '$api/config/firebase';
import { ref, push, set, get, update, remove } from 'firebase/database';

/**
 * Fetch all assessments for a course
 * @param {string} courseId - The ID of the course
 * @returns {Promise<Array>} - List of assessments
 */
export const fetchAllAssessmentsByCourse = async (courseId) => {
  if (!courseId) return [];
  
  try {
    const assessmentsRef = ref(database, `courseAssessments/${courseId}`);
    const snapshot = await get(assessmentsRef);
    
    if (snapshot.exists()) {
      const assessmentsData = snapshot.val();
      return Object.keys(assessmentsData).map(id => ({
        id,
        ...assessmentsData[id]
      }));
    } else {
      return [];
    }
  } catch (error) {
    console.error("Error fetching assessments:", error);
    throw new Error("Falha ao carregar avaliações");
  }
};

/**
 * Create a new assessment
 * @param {string} courseId - The ID of the course
 * @param {Object} assessment - The assessment data
 * @returns {Promise<string>} - The ID of the created assessment
 */
export const createAssessment = async (courseId, assessment) => {
  if (!courseId) throw new Error("ID do curso é obrigatório");
  
  try {
    const assessmentsRef = ref(database, `courseAssessments/${courseId}`);
    const newAssessmentRef = push(assessmentsRef);
    
    await set(newAssessmentRef, {
      name: assessment.name,
      percentage: assessment.percentage,
      createdAt: new Date().toISOString(),
      courseId: courseId
    });
    
    return newAssessmentRef.key;
  } catch (error) {
    console.error("Error creating assessment:", error);
    throw new Error("Falha ao criar avaliação");
  }
};

/**
 * Update an existing assessment
 * @param {string} courseId - The ID of the course
 * @param {string} assessmentId - The assessment ID
 * @param {Object} updatedData - The updated assessment data
 */
export const updateAssessment = async (courseId, assessmentId, updatedData) => {
  if (!courseId || !assessmentId) throw new Error("IDs do curso e avaliação são obrigatórios");
  
  try {
    const assessmentRef = ref(database, `courseAssessments/${courseId}/${assessmentId}`);
    
    await update(assessmentRef, {
      ...updatedData,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error updating assessment:", error);
    throw new Error("Falha ao atualizar avaliação");
  }
};

/**
 * Delete an assessment
 * @param {string} courseId - The ID of the course
 * @param {string} assessmentId - The assessment ID
 */
export const deleteAssessment = async (courseId, assessmentId) => {
  if (!courseId || !assessmentId) throw new Error("IDs do curso e avaliação são obrigatórios");
  
  try {
    const assessmentRef = ref(database, `courseAssessments/${courseId}/${assessmentId}`);
    await remove(assessmentRef);
  } catch (error) {
    console.error("Error deleting assessment:", error);
    throw new Error("Falha ao excluir avaliação");
  }
};

/**
 * Assign a grade to a student for an assessment
 * @param {string} courseId - The ID of the course
 * @param {string} assessmentId - The assessment ID
 * @param {string} studentId - The student ID
 * @param {number} grade - The grade value
 */
export const assignGrade = async (courseId, assessmentId, studentId, grade) => {
  if (!courseId || !assessmentId || !studentId) 
    throw new Error("IDs do curso, avaliação e estudante são obrigatórios");
  
  try {
    const gradeRef = ref(
      database, 
      `courseAssessments/${courseId}/${assessmentId}/grades/${studentId}`
    );
    
    await set(gradeRef, {
      grade,
      assignedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error assigning grade:", error);
    throw new Error("Falha ao atribuir nota");
  }
};

/**
 * Get grades for a specific assessment
 * @param {string} courseId - The ID of the course
 * @param {string} assessmentId - The assessment ID
 * @returns {Promise<Array>} - List of grades with student IDs
 */
export const getAssessmentGrades = async (courseId, assessmentId) => {
  if (!courseId || !assessmentId) return [];
  
  try {
    const gradesRef = ref(
      database, 
      `courseAssessments/${courseId}/${assessmentId}/grades`
    );
    
    const snapshot = await get(gradesRef);
    
    if (snapshot.exists()) {
      const gradesData = snapshot.val();
      return Object.keys(gradesData).map(studentId => ({
        studentId,
        ...gradesData[studentId]
      }));
    }
    
    return [];
  } catch (error) {
    console.error("Error fetching grades:", error);
    throw new Error("Falha ao carregar notas");
  }
};