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
        console.error("Erro ao buscar cursos: ", error);
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

        console.log(userId)


        const coursesRef = ref(database, "studentCourses");
        const inProgressQuery = query(
            coursesRef,
            orderByChild("userId"),
            equalTo(userId)
        );

        const snapshot = await get(inProgressQuery);

        console.log("Snapshot recebido para cursos em andamento:", snapshot.val());

        if (snapshot.exists()) {
            const inProgressCourses = Object.values(snapshot.val()).filter(
                (course) => course.status === "in_progress"
            );
            console.log("Cursos em andamento filtrados:", inProgressCourses);
            return inProgressCourses;
        }

        console.log("Nenhum curso em andamento encontrado.");
        return [];
    } catch (error) {
        console.error("Erro ao buscar cursos em andamento:", error);
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

        const snapshot = await get(completedQuery);

        console.log("Snapshot recebido para cursos concluídos:", snapshot.val());

        if (snapshot.exists()) {
            const completedCourses = Object.values(snapshot.val()).filter(
                (course) => course.status === "completed"
            );
            console.log("Cursos concluídos filtrados:", completedCourses);
            return completedCourses;
        }

        console.log("Nenhum curso concluído encontrado.");
        return [];
    } catch (error) {
        console.error("Erro ao buscar cursos concluídos:", error);
        throw error;
    }
};


export const fetchCourseVideos = async (courseId) => {
    const videosRef = ref(database, "courseVideos");
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

            console.log("Vídeos carregados:", videos);
            return videos;
        }

        console.log("Nenhum vídeo encontrado para o curso:", courseId);
        return [];
    } catch (error) {
        console.error("Erro ao buscar vídeos do curso:", error);
        throw error;
    }
};


export const fetchQuizQuestions = async (quizId) => {
    console.log("QuizId recebido:", quizId);
    const [courseId, videoId] = quizId.split('/');
    const quizRef = ref(database, `courseQuizzes/${courseId}/${videoId}`);

    try {
        const snapshot = await get(quizRef);
        if (snapshot.exists()) {
            const data = snapshot.val();
            console.log("Dados do quiz recebidos:", data);
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
            console.log("Quiz não encontrado para o quizId:", quizId);
            throw new Error("Quiz não encontrado!");
        }
    } catch (error) {
        console.error("Erro ao buscar questões do quiz:", error);
        throw error;
    }
};

export const validateQuizAnswers = async (userAnswers, quizId, /*userId, courseId,*/ minPercentage) => {
    console.log("Iniciando validação do quiz...");
    console.log("QuizId recebido:", quizId);
    console.log("UserAnswers recebidas:", userAnswers);

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
                console.log(`Resposta correta para a questão ${question.id}.`);
            } else {
                console.log(`Resposta incorreta para a questão ${question.id}.`);
            }
        });

        const scorePercentage = (earnedPoints / totalPoints) * 100;
        const isPassed = scorePercentage >= (minPercentage || 0);

        console.log("Validação concluída:", {
            isPassed,
            scorePercentage,
            earnedPoints,
            totalPoints,
        });

        return { isPassed, scorePercentage, earnedPoints, totalPoints };
    } catch (error) {
        console.error("Erro ao validar as respostas do quiz:", error);
        throw error;
    }
};

// export const validateQuizAnswersNonLogged = async (userAnswers, quizId, minPercentage) => {
//     console.log("Iniciando validação do quiz...");
//     console.log("QuizId recebido:", quizId);
//     console.log("UserAnswers recebidas:", userAnswers);

//     try {
//         const quizData = await fetchQuizQuestions(quizId);
//         const quizQuestions = quizData.questions;

//         let totalPoints = 0;
//         let earnedPoints = 0;

//         quizQuestions.forEach((question) => {
//             const userAnswer = userAnswers[question.id];
//             totalPoints += question.points;

//             if (userAnswer === question.correctOption) {
//                 earnedPoints += question.points;
//                 console.log(`Resposta correta para a questão ${question.id}.`);
//             } else {
//                 console.log(`Resposta incorreta para a questão ${question.id}.`);
//             }
//         });

//         const scorePercentage = (earnedPoints / totalPoints) * 100;
//         const isPassed = scorePercentage >= (minPercentage || 0);

//         console.log("Validação concluída:", {
//             isPassed,
//             scorePercentage,
//             earnedPoints,
//             totalPoints,
//         });

//         return { isPassed, scorePercentage, earnedPoints, totalPoints };
//     } catch (error) {
//         console.error("Erro ao validar as respostas do quiz:", error);
//         throw error;
//     }
// };


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
    const videosRef = ref(database, "courseVideos");
    const videosQuery = query(videosRef, orderByChild("courseId"), equalTo(courseId));
    const studentCourseRef = ref(database, `studentCourses/${userId}`);

    try {
        const [videosSnapshot, studentCourseSnapshot] = await Promise.all([
            get(videosQuery),
            get(studentCourseRef),
        ]);

        if (!videosSnapshot.exists()) {
            console.log("Nenhum vídeo encontrado para o curso.");
            return [];
        }

        if (!studentCourseSnapshot.exists()) {
            console.log("Nenhum progresso encontrado para o estudante.");
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

        console.log("Vídeos processados:", processedVideos);

        return processedVideos;
    } catch (error) {
        console.error("Erro ao buscar vídeos do curso com progresso:", error);
        throw error;
    }
};

