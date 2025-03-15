import { auth, database } from "../service/firebase";
import { ref, get, query, orderByChild, equalTo, set } from "firebase/database";

export async function hasCourseVideos(courseId) {
    try {
        const courseVideosRef = ref(database, `courseVideos/${courseId}`);
        const snapshot = await get(courseVideosRef);
        const courseVideos = snapshot.val();
        return courseVideos ? Object.entries(courseVideos).map(([key, video]) => ({ id: key, ...video })) : [];
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
        return courseMaterials ? Object.entries(courseMaterials).map(([key, material]) => ({ id: key, ...material })) : [];
    } catch (error) {
        console.error("Erro ao verificar materiais do curso:", error);
        return null;
    }
}

export const hasCourseQuizzes = async (courseId) => {
    try {
        const courseQuizzesRef = ref(database, `courseQuizzes/${courseId}`);
        const snapshot = await get(courseQuizzesRef);
        const courseQuizzes = snapshot.val();
        return courseQuizzes ? Object.entries(courseQuizzes).map(([key, quiz]) => ({ id: key, ...quiz })) : [];
    } catch (error) {
        console.error("Erro ao verificar quizzes do curso:", error);
        return null;
    }
}

export const hasVideoQuizzes = async (courseId, videoId) => {
    try {
        const videoQuizzesRef = ref(database, `courseQuizzes/${courseId}/${videoId}`);
        const snapshot = await get(videoQuizzesRef);
        const videoQuizzes = snapshot.val();
        return videoQuizzes ? Object.entries(videoQuizzes).map(([key, quiz]) => ({ id: key, ...quiz })) : [];
    } catch (error) {
        console.error("Erro ao verificar quizzes do vídeo:", error);
        return null;
    }
}