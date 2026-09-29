// Cenário mínimo do catálogo: um curso aberto, sem conteúdo, de um professor.

export const PROFESSOR_ID = "e2e-professor";
export const COURSE_ID = "e2e-curso-aberto";
export const COURSE_TITLE = "Curso E2E de Exemplo";

export const catalogScenario = () => ({
  users: {
    [PROFESSOR_ID]: {
      firstName: "Professora",
      lastName: "E2E",
      email: "professora.e2e@example.com",
      role: "teacher",
    },
  },
  courses: {
    [COURSE_ID]: {
      title: COURSE_TITLE,
      description: "Curso criado pelos testes de ponta a ponta.",
      userId: PROFESSOR_ID,
      pinEnabled: false,
    },
  },
});
