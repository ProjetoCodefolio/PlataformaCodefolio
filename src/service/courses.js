import { ref, get, query, orderByChild, equalTo, update } from "firebase/database";
import { collection, getDocs } from "firebase/firestore";
import { database } from "./firebase";

const fetchCourses = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, "courses"));
        const courses = [];
        querySnapshot.forEach((doc) => {
            courses.push({ id: doc.id, ...doc.data() });
        });
        setCourses(courses);
    } catch (error) {
    }
};

export const fetchCourseById = async (courseId) => {
    try {
        const courseDoc = await getDoc(doc(db, "courses", courseId));
        if (courseDoc.exists()) {
            return { courseId: courseDoc.id, ...courseDoc.data() };
        } else {
            throw new Error("Curso não encontrado.");
        }
    } catch (error) {
        console.error("Erro ao buscar curso:", error);
        throw error;
    }
};

export const fetchAllCourses = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, "courses"));
        const courses = querySnapshot.docs.map((doc) => ({
            courseId: doc.id,
            ...doc.data(),
        }));
        return courses;
    } catch (error) {
        console.error("Erro ao buscar cursos:", error);
        throw error;
    }
};

export const fetchInProgressCourses = async (userId) => {
    try {

        const coursesRef = ref(database, "studentCourses");
        const inProgressQuery = query(
            coursesRef,
            orderByChild("userId"),
            equalTo(userId)
        );

        const snapshot = await get(inProgressQuery);


        if (snapshot.exists()) {
            const inProgressCourses = Object.values(snapshot.val()).filter(
                (course) => course.status === "in_progress"
            );
            return inProgressCourses;
        }
        return [];
    } catch (error) {
        throw error;
    }
};

export const deleteCourse = async (courseId) => {
    try {
        await deleteDoc(doc(db, "courses", courseId));
    } catch (error) {
        console.error("Erro ao deletar curso:", error);
    }
};


export const fetchCompletedCourses = async (userId) => {
    try {


        const coursesRef = ref(database, "studentCourses");
        const completedQuery = query(
            coursesRef,
            orderByChild("userId"),
            equalTo(userId)
        );

        const snapshot = await get(completedQuery)

        if (snapshot.exists()) {
            const completedCourses = Object.values(snapshot.val()).filter(
                (course) => course.status === "completed"
            );
            return completedCourses;
        }

        return [];
    } catch (error) {
        throw error;
    }
};


export const fetchCourseVideos = async (courseId) => {
    const videosRef = ref(database, `courseVideos/${courseId}`);
    const videosQuery = query(videosRef, orderByChild("courseId"), equalTo(courseId));

    try {
        const snapshot = await get(videosQuery);

        if (snapshot.exists()) {
            const videos = Object.entries(snapshot.val()).map(([id, video]) => ({
                id,
                title: video.title || '',
                url: video.url || '',
                description: video.description || '',
                duration: video.duration || '',
                courseId: video.courseId
            }));

            return videos;
        }

        return [];
    } catch (error) {
        throw error;
    }
};


export const fetchQuizQuestions = async (quizId) => {
    const [courseId, videoId] = quizId.split('/');
    const quizRef = ref(database, `courseQuizzes/${courseId}/${videoId}`);

    try {
        const snapshot = await get(quizRef);
        if (snapshot.exists()) {
            const data = snapshot.val();
            return {
                questions: data.questions.map((question, index) => ({
                    id: index, // Usar índice como ID
                    question: question.question,
                    options: question.options,
                    correctOption: question.correctOption,
                    points: 1,
                })),
                minPercentage: data.minPercentage || 0,
            };
        } else {
            throw new Error("Quiz não encontrado!");
        }
    } catch (error) {
        console.error("Erro ao buscar questões do quiz:", error);
        throw error;
    }
};

export const validateQuizAnswers = async (userAnswers, quizId, /*userId, courseId,*/ minPercentage) => {

    try {
        const quizData = await fetchQuizQuestions(quizId);
        const quizQuestions = quizData.questions;

        let totalPoints = 0;
        let earnedPoints = 0;

        quizQuestions.forEach((question) => {
            const userAnswer = userAnswers[question.id];
            totalPoints += question.points;

            if (userAnswer === question.correctOption) {
                earnedPoints += question.points;
            } else {
            }
        });

        const scorePercentage = (earnedPoints / totalPoints) * 100;
        const isPassed = scorePercentage >= (minPercentage || 0);

        return { isPassed, scorePercentage, earnedPoints, totalPoints };
    } catch (error) {
        console.error("Erro ao validar as respostas do quiz:", error);
        throw error;
    }
};


export const markQuizAsCompleted = async (userId, quizId) => {
    const studentQuizRef = ref(database, `studentCourses/${userId}/quizCompleted`);
    const updates = {};
    updates[quizId] = true;
    await update(studentQuizRef, updates);
};


export const markVideoAsWatched = async (userId, courseId, videoId) => {
    const videoRef = ref(database, `studentCourses/${userId}/watchedVideos`);
    const updates = {};
    updates[videoId] = true;
    await update(videoRef, updates);
};


export const fetchCourseVideosWithWatchedStatus = async (courseId, userId) => {
    const videosRef = ref(database, `courseVideos/${courseId}`);
    const videosQuery = query(videosRef, orderByChild("courseId"), equalTo(courseId));
    const studentCourseRef = ref(database, `studentCourses/${userId}`);

    try {
        const [videosSnapshot, studentCourseSnapshot] = await Promise.all([
            get(videosQuery),
            get(studentCourseRef),
        ]);

        if (!videosSnapshot.exists()) {
            return [];
        }

        if (!studentCourseSnapshot.exists()) {
            return [];
        }

        const videos = Object.entries(videosSnapshot.val()).map(([id, video]) => ({
            ...video,
            id,
        }));

        const studentCourse = studentCourseSnapshot.val();
        const watchedVideos = studentCourse.watchedVideos || {};
        const quizPassed = studentCourse.quizPassed || {};

        const processedVideos = videos.map((video, index) => ({
            ...video,
            watched: !!watchedVideos[video.id],
            quizPassed: !!quizPassed[video.quizId],
            locked:
                index > 0 &&
                (!watchedVideos[videos[index - 1].id] || !quizPassed[videos[index - 1].quizId]),
        }));


        return processedVideos;
    } catch (error) {
        throw error;
    }
};

export const updateCourseProgress = async (userId, courseId, videos) => {
    let newProgress = 0;
    const totalVideos = videos.length;

    const studentCoursesRef = ref(database, `studentCourses/${userId}/${courseId}`);
    const studentCoursesSnapshot = await get(studentCoursesRef);
    const studentCourses = studentCoursesSnapshot.val();

    // Se não há vídeos, definimos o progresso como 100% (curso completado)
    // ou poderíamos definir como 0% dependendo da lógica desejada
    if (totalVideos === 0) {
        newProgress = 0 // Ou 0, dependendo da sua preferência
    } else {
        const videosRef = ref(database, `videoProgress/${userId}/${courseId}`);
        const videosSnapshot = await get(videosRef);
        const videosData = videosSnapshot.val();

        const watchedVideos = videosData ? Object.values(videosData).filter((video) => video.watched).length : 0;
        newProgress = (watchedVideos / totalVideos) * 100;
    }

    await update(studentCoursesRef, { 
        progress: newProgress, 
        status: newProgress === 100 ? "completed" : "in_progress" 
    });
};

export const updateAllUsersCourseProgress = async (courseId, videos) => {
    const studentCoursesRef = ref(database, `studentCourses`);
    const studentCoursesSnapshot = await get(studentCoursesRef);
    const studentCoursesData = studentCoursesSnapshot.val();

    if (studentCoursesData) {
        const userIds = Object.keys(studentCoursesData);
        for (const userId of userIds) {
            if (studentCoursesData[userId][courseId]) {
                await updateCourseProgress(userId, courseId, videos);
            }
        }
    }
};