import { videosScenario, VIDEO_COURSE_ID, VIDEO_1 } from "./videos";

// O curso de vídeos com um quiz no primeiro vídeo: duas questões de múltipla
// escolha, nota mínima de 70% e até 2 tentativas. Como o vídeo 2 exige o
// anterior, ele só destrava com o vídeo 1 assistido E o quiz aprovado.

export const QUIZ = {
  minPercentage: 70,
  maxAttempts: 2,
  questions: [
    { id: "q1", question: "Quanto é 2 + 2?", options: ["3", "4", "5"], correct: "4", wrong: "3" },
    {
      id: "q2",
      question: "Qual a capital do Brasil?",
      options: ["Brasília", "Rio de Janeiro", "Salvador"],
      correct: "Brasília",
      wrong: "Salvador",
    },
  ],
};

export const quizScenario = ({ alunoId }) => {
  const scenario = videosScenario({ alunoId });
  scenario.courseQuizzes = {
    [VIDEO_COURSE_ID]: {
      [VIDEO_1.id]: {
        videoId: VIDEO_1.id,
        courseId: VIDEO_COURSE_ID,
        minPercentage: QUIZ.minPercentage,
        allowRetry: true,
        maxAttempts: QUIZ.maxAttempts,
        questions: QUIZ.questions.map(({ id, question, options, correct }) => ({
          id,
          question,
          questionType: "multiple-choice",
          options,
          correctOption: options.indexOf(correct),
        })),
      },
    },
  };
  return scenario;
};
