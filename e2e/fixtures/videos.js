import { PROFESSOR_ID } from "./catalog";
import { ALUNO } from "./access";

// Curso aberto com dois vídeos em sequência: o segundo só destrava depois
// que o aluno assiste o primeiro (`requiresPrevious`). Os ids do YouTube são
// falsos (11 caracteres, como os de verdade); quem "toca" é o player falso de
// support/youtubeStub.js.

export const VIDEO_COURSE_ID = "e2e-curso-videos";
export const VIDEO_1 = { id: "e2e-video-1", title: "Aula 1: Introdução", youtubeId: "e2eVideo001" };
export const VIDEO_2 = { id: "e2e-video-2", title: "Aula 2: Continuação", youtubeId: "e2eVideo002" };

export { ALUNO };

const youtubeUrl = (youtubeId) => `https://www.youtube.com/watch?v=${youtubeId}`;

export const videosScenario = ({ alunoId }) => ({
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
    [VIDEO_COURSE_ID]: {
      title: "Curso de Vídeos E2E",
      description: "Dois vídeos em sequência.",
      userId: PROFESSOR_ID,
      pinEnabled: false,
    },
  },
  courseContent: {
    [VIDEO_COURSE_ID]: {
      [VIDEO_1.id]: {
        category: "video",
        title: VIDEO_1.title,
        url: youtubeUrl(VIDEO_1.youtubeId),
        order: 0,
        requiresPrevious: false,
      },
      [VIDEO_2.id]: {
        category: "video",
        title: VIDEO_2.title,
        url: youtubeUrl(VIDEO_2.youtubeId),
        order: 1,
        requiresPrevious: true,
      },
    },
  },
});
