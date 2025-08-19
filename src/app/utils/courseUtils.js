import { ref, get, query, orderByChild, equalTo, set } from "firebase/database";
import { auth, database } from "$api/config/firebase";

export async function hasCourseVideos(courseId) {
  try {
    const courseVideosRef = ref(database, `courseVideos/${courseId}`);
    const snapshot = await get(courseVideosRef);
    const courseVideos = snapshot.val();
    return courseVideos
      ? Object.entries(courseVideos).map(([key, video]) => ({
          id: key,
          ...video,
        }))
      : [];
  } catch (error) {
    console.error("Erro ao verificar vídeos do curso:", error);
    return null;
  }
}

export const hasCourseMaterials = async (courseId) => {
  try {
    const courseMaterialsRef = ref(database, `courseMaterials/${courseId}`);
    const snapshot = await get(courseMaterialsRef);
    const courseMaterials = snapshot.val();
    return courseMaterials
      ? Object.entries(courseMaterials).map(([key, material]) => ({
          id: key,
          ...material,
        }))
      : [];
  } catch (error) {
    console.error("Erro ao verificar materiais do curso:", error);
    return null;
  }
};

export const hasCourseQuizzes = async (courseId) => {
  try {
    const courseQuizzesRef = ref(database, `courseQuizzes/${courseId}`);
    const snapshot = await get(courseQuizzesRef);
    const courseQuizzes = snapshot.val();
    return courseQuizzes
      ? Object.entries(courseQuizzes).map(([key, quiz]) => ({
          id: key,
          ...quiz,
        }))
      : [];
  } catch (error) {
    console.error("Erro ao verificar quizzes do curso:", error);
    return null;
  }
};

export const hasVideoQuizzes = async (courseId, videoId) => {
  try {
    const videoQuizzesRef = ref(
      database,
      `courseQuizzes/${courseId}/${videoId}`
    );
    const snapshot = await get(videoQuizzesRef);
    const videoQuizzes = snapshot.val();
    return videoQuizzes
      ? Object.entries(videoQuizzes).map(([key, quiz]) => ({
          id: key,
          ...quiz,
        }))
      : [];
  } catch (error) {
    console.error("Erro ao verificar quizzes do vídeo:", error);
    return null;
  }
};

// Adicione estas funções ao arquivo existente
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

export const hasCourseSlides = async (courseId) => {
  try {
    const courseSlidesRef = ref(database, `courseSlides/${courseId}`);
    const snapshot = await get(courseSlidesRef);
    const courseSlides = snapshot.val();
    return courseSlides
      ? Object.entries(courseSlides).map(([key, slide]) => ({
          id: key,
          ...slide,
        }))
      : [];
  } catch (error) {
    console.error("Erro ao verificar slides do curso:", error);
    return [];
  }
};
