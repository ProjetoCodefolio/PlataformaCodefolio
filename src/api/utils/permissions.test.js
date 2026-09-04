import { describe, it, expect } from "vitest";
import {
  isCourseTeacher,
  canManageCourse,
  canRunCourse,
  canEditCourse,
  canDeleteCourse,
  canManageContent,
  canManageStudents,
  canAssignGrades,
  canManageAssessments,
  canViewQuizResults,
} from "./permissions";

/**
 * O que este teste protege é a LINHA entre cadastrar o curso e tocar a turma.
 * O professor convidado dá aula: mexe em conteúdo, quiz, notas, avaliações e
 * alunos. Ele não renomeia nem apaga a disciplina de quem o convidou.
 *
 * A correspondência com `database.rules.json` é guardada por
 * `teacherRole.rules.emulator.test.js`; aqui é só a decisão da interface.
 */

const CURSO = "curso1";
const OUTRO_CURSO = "curso2";
const DONO = "uid_dono";

const dono = { userId: DONO, role: "user" };
const admin = { userId: "uid_admin", role: "admin" };
const professor = {
  userId: "uid_prof",
  role: "teacher",
  coursesTeacher: { [CURSO]: true },
};
const professorDeOutraTurma = {
  userId: "uid_prof2",
  role: "teacher",
  coursesTeacher: { [OUTRO_CURSO]: true },
};
const aluno = { userId: "uid_aluno", role: "user" };

const DE_SALA_DE_AULA = [
  ["conteúdo", canManageContent],
  ["alunos", canManageStudents],
  ["notas", canAssignGrades],
  ["avaliações", canManageAssessments],
  ["resultados de quiz", canViewQuizResults],
];

const DO_CADASTRO = [
  ["editar", canEditCourse],
  ["excluir", canDeleteCourse],
];

describe("isCourseTeacher", () => {
  it("reconhece o professor daquele curso", () => {
    expect(isCourseTeacher(professor, CURSO)).toBe(true);
  });

  it("o papel é por curso, não geral", () => {
    expect(isCourseTeacher(professorDeOutraTurma, CURSO)).toBe(false);
  });

  it("role 'teacher' sozinho não vale", () => {
    expect(isCourseTeacher({ userId: "x", role: "teacher" }, CURSO)).toBe(false);
  });

  it("sem courseId a resposta é não", () => {
    expect(isCourseTeacher(professor, undefined)).toBe(false);
  });

  it("sem usuário a resposta é não", () => {
    expect(isCourseTeacher(null, CURSO)).toBe(false);
  });
});

describe.each(DE_SALA_DE_AULA)("%s — trabalho de sala de aula", (_nome, pode) => {
  it("o professor daquele curso pode", () => {
    expect(pode(professor, DONO, CURSO)).toBe(true);
  });

  it("o dono pode", () => {
    expect(pode(dono, DONO, CURSO)).toBe(true);
  });

  it("o admin pode", () => {
    expect(pode(admin, DONO, CURSO)).toBe(true);
  });

  it("o professor de outra turma não pode", () => {
    expect(pode(professorDeOutraTurma, DONO, CURSO)).toBe(false);
  });

  it("o aluno não pode", () => {
    expect(pode(aluno, DONO, CURSO)).toBe(false);
  });

  it("sem courseId falha fechada, e não aberta", () => {
    expect(pode(professor, DONO)).toBe(false);
    // O dono continua podendo: a autoridade dele não depende do courseId.
    expect(pode(dono, DONO)).toBe(true);
  });
});

describe.each(DO_CADASTRO)("%s o curso — cadastro, não sala de aula", (_nome, pode) => {
  it("o dono pode", () => {
    expect(pode(dono, DONO)).toBe(true);
  });

  it("o admin pode", () => {
    expect(pode(admin, DONO)).toBe(true);
  });

  it("o professor daquele curso NÃO pode", () => {
    expect(pode(professor, DONO, CURSO)).toBe(false);
  });
});

describe("canManageCourse e canRunCourse são coisas diferentes", () => {
  it("canManageCourse ignora o professor de propósito", () => {
    expect(canManageCourse(professor, DONO)).toBe(false);
  });

  it("canRunCourse inclui o professor", () => {
    expect(canRunCourse(professor, DONO, CURSO)).toBe(true);
  });
});
