import { auth, database } from "../config/firebase";
import { ref, get, query, orderByChild, equalTo, set } from "firebase/database";

/**
 * Verifica se um curso possui vídeos
 * @param {string} courseId - ID do curso
 * @returns {Promise<Array>} - Array de vídeos do curso
 */
export const hasCourseVideos = async (courseId) => {
  try {
    const videosRef = ref(database, `courseVideos/${courseId}`);
    const snapshot = await get(videosRef);
    
    if (snapshot.exists()) {
      return Object.keys(snapshot.val());
    }
    
    return [];
  } catch (error) {
    console.error("Erro ao verificar vídeos do curso:", error);
    return [];
  }
};

/**
 * Verifica se um curso possui materiais extras
 * @param {string} courseId - ID do curso
 * @returns {Promise<Array>} - Array de materiais do curso
 */
export const hasCourseMaterials = async (courseId) => {
  try {
    const materialsRef = ref(database, `courseMaterials/${courseId}`);
    const snapshot = await get(materialsRef);
    
    if (snapshot.exists()) {
      return Object.keys(snapshot.val());
    }
    
    return [];
  } catch (error) {
    console.error("Erro ao verificar materiais do curso:", error);
    return [];
  }
};

/**
 * Verifica se um curso possui quizzes
 * @param {string} courseId - ID do curso
 * @returns {Promise<Array>} - Array de quizzes do curso
 */
export const hasCourseQuizzes = async (courseId) => {
  try {
    const quizzesRef = ref(database, `courseQuizzes/${courseId}`);
    const snapshot = await get(quizzesRef);
    
    if (snapshot.exists()) {
      return Object.keys(snapshot.val());
    }
    
    return [];
  } catch (error) {
    console.error("Erro ao verificar quizzes do curso:", error);
    return [];
  }
};

/**
 * Verifica se um curso possui slides
 * @param {string} courseId - ID do curso
 * @returns {Promise<Array>} - Array de slides do curso
 */
export const hasCourseSlides = async (courseId) => {
  try {
    const slidesRef = ref(database, `courseSlides/${courseId}`);
    const snapshot = await get(slidesRef);
    
    if (snapshot.exists()) {
      return Object.keys(snapshot.val());
    }
    
    return [];
  } catch (error) {
    console.error("Erro ao verificar slides do curso:", error);
    return [];
  }
};

/**
 * Verifica se um vídeo específico possui quizzes associados
 * @param {string} courseId - ID do curso
 * @param {string} videoId - ID do vídeo
 * @returns {Promise<Array>} - Array com o ID do vídeo se possuir quizzes, ou vazio caso contrário
 */
export const hasVideoQuizzes = async (courseId, videoId) => {
  try {
    const quizzesRef = ref(database, `courseQuizzes/${courseId}/${videoId}`);
    const snapshot = await get(quizzesRef);
    
    if (snapshot.exists()) {
      return [videoId];
    }
    
    return [];
  } catch (error) {
    console.error("Erro ao verificar quizzes do vídeo:", error);
    return [];
  }
};

export const saveQuizToDatabase = async (
  quiz,
  courseId,
  database,
  firebaseRef
) => {
  try {
    const quizData = {
      questions: quiz.questions,
      minPercentage: quiz.minPercentage,
      courseId: courseId,
      videoId: quiz.videoId,
    };
    const courseQuizzesRef = firebaseRef(
      database,
      `courseQuizzes/${courseId}/${quiz.videoId}`
    );
    await set(courseQuizzesRef, quizData);
    return true;
  } catch (error) {
    console.error("Erro ao salvar quiz:", error);
    return false;
  }
};

export const generateUUID = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};
