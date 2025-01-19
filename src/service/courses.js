import { ref, get, query, orderByChild, equalTo, update } from "firebase/database";
import { database } from "./firebase";


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
                ...video,
                id,
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
    const quizRef = ref(database, `courseQuizzes/${quizId}`);

    try {
        const snapshot = await get(quizRef);

        if (snapshot.exists()) {
            const data = snapshot.val();
            console.log("Dados do quiz recebidos:", data);


            return Object.entries(data.questions).map(([id, question]) => ({
                id,
                ...question,
            }));
        } else {
            console.log("Quiz não encontrado para o quizId:", quizId);
            throw new Error("Quiz não encontrado!");
        }
    } catch (error) {
        console.error("Erro ao buscar questões do quiz:", error);
        throw error;
    }
};

export const validateQuizAnswers = async (userAnswers, quizId, userId, courseId) => {
    console.log("Iniciando validação do quiz...");
    console.log("QuizId recebido:", quizId);
    console.log("UserAnswers recebidas:", userAnswers);

    try {
        const quizQuestions = await fetchQuizQuestions(quizId);
        console.log("Questões do quiz:", quizQuestions);

        let totalPoints = 0;
        let earnedPoints = 0;

        quizQuestions.forEach((question) => {
            const userAnswer = userAnswers[question.id];
            totalPoints += question.points;


            if (userAnswer === question.options[parseInt(question.answer)]) {
                earnedPoints += question.points;
                console.log(`Resposta correta para a questão ${question.id}.`);
            } else {
                console.log(`Resposta incorreta para a questão ${question.id}.`);
            }
        });

        const scorePercentage = (earnedPoints / totalPoints) * 100;
        const isPassed = scorePercentage >= 70;


        const userQuizRef = ref(database, `studentCourses/${userId}/quizPassed`);
        await update(userQuizRef, {
            [quizId]: isPassed,
        });

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

        if (videosSnapshot.exists() && studentCourseSnapshot.exists()) {
            const videos = Object.entries(videosSnapshot.val()).map(([id, video]) => ({
                ...video,
                id,
            }));

            const studentCourse = studentCourseSnapshot.val();
            const watchedVideos = studentCourse.watchedVideos || {};
            const quizPassed = studentCourse.quizPassed || {};

            return videos.map((video, index) => ({
                ...video,
                watched: !!watchedVideos[video.id],
                quizPassed: !!quizPassed[video.id],
                locked:
                    index > 0 && (!watchedVideos[videos[index - 1].id] || !quizPassed[videos[index - 1].id]),
            }));
        }
        return [];
    } catch (error) {
        console.error("Erro ao buscar vídeos do curso com progresso:", error);
        throw error;
    }
};
