import { PROFESSOR_ID } from "./catalog";

// Professor de verdade (com conta no emulador de Auth) para os testes em que
// é ele quem mexe na tela. Os cenários semeiam a professora com o id fixo
// PROFESSOR_ID; `asTeacher` troca esse id pelo uid da conta criada, como dono
// do curso.

export const PROFESSORA = { email: "professora.e2e@example.com", displayName: "Professora E2E" };

/**
 * @param {Object} scenario - cenário com a professora em PROFESSOR_ID
 * @param {string} professorId - uid da conta criada no emulador de Auth
 */
export const asTeacher = (scenario, professorId) => {
  const { [PROFESSOR_ID]: professora, ...users } = scenario.users;
  const courses = Object.fromEntries(
    Object.entries(scenario.courses).map(([id, course]) => [
      id,
      course.userId === PROFESSOR_ID ? { ...course, userId: professorId } : course,
    ])
  );
  return { ...scenario, users: { ...users, [professorId]: professora }, courses };
};
