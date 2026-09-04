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
      description: assessment.description || "",
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
      description: updatedData.description || "",
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
 * Assign a grade to a student for an assessment.
 *
 * Grava por CAMPO, não substituindo o registro inteiro. A nota e o feedback do
 * professor são vizinhos em `grades/{studentId}`, e escritos em momentos
 * diferentes: um `set()` aqui apagaria o texto do feedback toda vez que a nota
 * fosse corrigida, sem nenhum aviso.
 *
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
    
    await update(gradeRef, {
      grade,
      assignedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error assigning grade:", error);
    throw new Error("Falha ao atribuir nota");
  }
};

/**
 * Grava o feedback escrito do professor para um ou mais alunos de uma avaliação.
 *
 * Recebe uma LISTA de alunos porque o caso que motivou a função é o trabalho em
 * grupo: o texto é o mesmo para todo o grupo e precisa chegar inteiro a todos —
 * um update por integrante deixaria metade do grupo sem o retorno se uma das
 * escritas falhasse no meio.
 *
 * Texto vazio APAGA o feedback: é como o professor desfaz um comentário.
 *
 * @param {string} courseId
 * @param {string} assessmentId
 * @param {Array<string>} studentIds
 * @param {string} feedback - texto; vazio remove
 */
export const assignFeedback = async (courseId, assessmentId, studentIds, feedback) => {
  if (!courseId || !assessmentId) {
    throw new Error("IDs do curso e da avaliação são obrigatórios");
  }
  const alunos = (studentIds || []).filter(Boolean);
  if (alunos.length === 0) {
    throw new Error("Informe ao menos um estudante");
  }

  const texto = String(feedback ?? "").trim();
  const agora = new Date().toISOString();
  const updates = {};

  alunos.forEach((studentId) => {
    const base = `courseAssessments/${courseId}/${assessmentId}/grades/${studentId}`;
    updates[`${base}/feedback`] = texto || null;
    updates[`${base}/feedbackAt`] = texto ? agora : null;
  });

  try {
    await update(ref(database), updates);
  } catch (error) {
    console.error("Error assigning feedback:", error);
    throw new Error("Falha ao salvar o feedback");
  }
};

/**
 * Assign several grades at once, across assessments and students.
 *
 * Uses a single multi-path update so the whole import is atomic: chamar
 * assignGrade uma vez por nota deixaria a turma com notas pela metade se uma
 * das escritas falhasse no meio.
 *
 * @param {string} courseId - The ID of the course
 * @param {Array} changes - `[{ assessmentId, userId, newGrade }]`
 */
export const assignGradesBatch = async (courseId, changes) => {
  if (!courseId) throw new Error("ID do curso é obrigatório");
  if (!changes || changes.length === 0) return;

  const assignedAt = new Date().toISOString();
  const updates = {};

  changes.forEach(({ assessmentId, userId, newGrade }) => {
    if (!assessmentId || !userId) {
      throw new Error("IDs da avaliação e do estudante são obrigatórios");
    }
    // Caminhos de FOLHA, não o registro inteiro: importar uma planilha de notas
    // não pode apagar o feedback que o professor já tinha escrito.
    const base = `courseAssessments/${courseId}/${assessmentId}/grades/${userId}`;
    updates[`${base}/grade`] = newGrade;
    updates[`${base}/assignedAt`] = assignedAt;
  });

  try {
    await update(ref(database), updates);
  } catch (error) {
    console.error("Error assigning grades in batch:", error);
    throw new Error("Falha ao importar as notas");
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