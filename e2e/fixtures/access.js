import { createHash } from "node:crypto";
import { PROFESSOR_ID } from "./catalog";

// Cenário do acesso à sala: um curso aberto e um fechado por PIN, do mesmo
// professor, e um aluno que ainda não entrou em nenhum dos dois.

export const OPEN_COURSE_ID = "e2e-curso-aberto";
export const CLOSED_COURSE_ID = "e2e-curso-fechado";
export const CLOSED_COURSE_PIN = "4321";

// Mesma regra de src/api/services/courses/pin.js: SHA-256 do PIN seguido do
// id do curso, em hexadecimal.
const pinHash = (pin, courseId) => createHash("sha256").update(pin + courseId).digest("hex");

export const ALUNO = { email: "aluno.e2e@example.com", displayName: "Aluno E2E" };

export const accessScenario = ({ alunoId }) => ({
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
    [OPEN_COURSE_ID]: {
      title: "Curso Aberto E2E",
      description: "Curso sem PIN.",
      userId: PROFESSOR_ID,
      pinEnabled: false,
    },
    [CLOSED_COURSE_ID]: {
      title: "Curso Fechado E2E",
      description: "Curso com PIN.",
      userId: PROFESSOR_ID,
      pinEnabled: true,
      pinHash: pinHash(CLOSED_COURSE_PIN, CLOSED_COURSE_ID),
    },
  },
});
