import { PROFESSOR_ID } from "./catalog";
import { ALUNO } from "./access";

// Duas turmas da mesma professora: a anterior (origem) tem uma aula com quiz;
// a atual (destino) tem uma aula sem quiz e um aluno matriculado, que é quem
// deve ser avisado do que chega por importação.

export const ORIGIN_COURSE_ID = "e2e-curso-origem";
export const TARGET_COURSE_ID = "e2e-curso-destino";
export const ORIGIN_COURSE_TITLE = "Turma Anterior";
export const TARGET_COURSE_TITLE = "Turma Atual";
export const ORIGIN_LESSON = { id: "e2e-aula-stride", title: "STRIDE" };
export const TARGET_LESSON = { id: "e2e-aula-existente", title: "Aula existente" };

export { ALUNO };

const youtubeUrl = (youtubeId) => `https://www.youtube.com/watch?v=${youtubeId}`;

export const importScenario = ({ alunoId }) => ({
  users: {
    [PROFESSOR_ID]: {
      firstName: "Professora",
      lastName: "E2E",
      email: "professora.e2e@example.com",
      role: "teacher",
    },
    [alunoId]: { firstName: "Aluno", lastName: "E2E", email: ALUNO.email },
  },
  courses: {
    [ORIGIN_COURSE_ID]: {
      title: ORIGIN_COURSE_TITLE,
      description: "Turma de onde o conteúdo é importado.",
      userId: PROFESSOR_ID,
      pinEnabled: false,
    },
    [TARGET_COURSE_ID]: {
      title: TARGET_COURSE_TITLE,
      description: "Turma que recebe o conteúdo.",
      userId: PROFESSOR_ID,
      pinEnabled: false,
    },
  },
  courseContent: {
    [ORIGIN_COURSE_ID]: {
      [ORIGIN_LESSON.id]: {
        category: "video",
        title: ORIGIN_LESSON.title,
        url: youtubeUrl("e2eVideo001"),
        order: 0,
      },
    },
    [TARGET_COURSE_ID]: {
      [TARGET_LESSON.id]: {
        category: "video",
        title: TARGET_LESSON.title,
        url: youtubeUrl("e2eVideo002"),
        order: 0,
      },
    },
  },
  courseQuizzes: {
    [ORIGIN_COURSE_ID]: {
      [ORIGIN_LESSON.id]: {
        videoId: ORIGIN_LESSON.id,
        courseId: ORIGIN_COURSE_ID,
        minPercentage: 70,
        questions: [
          {
            id: "q1",
            question: "O S de STRIDE é?",
            questionType: "multiple-choice",
            options: ["Spoofing", "Safety"],
            correctOption: 0,
          },
        ],
      },
    },
  },
  studentCourses: {
    [alunoId]: { [TARGET_COURSE_ID]: { progress: 0, status: "in_progress" } },
  },
});
