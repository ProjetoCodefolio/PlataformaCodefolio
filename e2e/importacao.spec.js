import { test, expect } from "./support/test";
import { resetDatabase, readDatabase } from "./support/emulator";
import { resetAuth, createAuthUser, loginAs } from "./support/auth";
import { asTeacher, PROFESSORA } from "./fixtures/teacher";
import {
  importScenario,
  ALUNO,
  TARGET_COURSE_ID,
  ORIGIN_COURSE_TITLE,
  TARGET_COURSE_TITLE,
  ORIGIN_LESSON,
  TARGET_LESSON,
} from "./fixtures/import";

// Importar de outro curso avisa a turma como o cadastro à mão (ver
// importAnnouncements.js): conteúdo no sino, quiz no sino e por e-mail (que o
// build de e2e nunca manda). Antes não avisava nada: foi assim que o quiz do
// STRIDE chegou a uma turma sem sino nem e-mail.

let aluno;

test.beforeEach(async ({ page }) => {
  await resetAuth();
  aluno = await createAuthUser(ALUNO);
  const professora = await createAuthUser(PROFESSORA);
  await resetDatabase(asTeacher(importScenario({ alunoId: aluno.uid }), professora.uid));
  await loginAs(page, professora);
  await page.goto(`/adm-cursos?courseId=${TARGET_COURSE_ID}`);
});

/** Os avisos do aluno, como "tipo: mensagem", em ordem estável. */
const avisosDoAluno = async () =>
  Object.values((await readDatabase(`notifications/${aluno.uid}`)) || {})
    .map((n) => `${n.type}: ${n.message}`)
    .sort();

const escolherCursoDeOrigem = async (dialog) => {
  await dialog.getByRole("combobox", { name: "Curso de origem" }).click();
  await dialog.page().getByRole("option", { name: ORIGIN_COURSE_TITLE }).click();
};

test("importar conteúdo com quiz avisa a turma do conteúdo e do quiz", async ({ page }) => {
  await page.getByRole("button", { name: "Importar de outro curso" }).click();
  const dialog = page.getByRole("dialog", { name: "Importar conteúdo de outro curso" });
  await escolherCursoDeOrigem(dialog);
  await expect(dialog.getByRole("checkbox", { name: "Trazer o questionário junto" })).toBeChecked();
  await expect(dialog.getByText(/chegam sem prazo de encerramento/)).toBeVisible();
  await dialog.getByRole("button", { name: "Importar 1" }).click();

  await expect.poll(avisosDoAluno).toEqual([
    `new_content: ${ORIGIN_LESSON.title}`,
    expect.stringMatching(new RegExp(`^new_quiz: ${TARGET_COURSE_TITLE}: ${ORIGIN_LESSON.title}`)),
  ]);
});

test("importar um quiz para uma aula que já existe avisa só o quiz", async ({ page }) => {
  await page.getByRole("tab", { name: "Quiz" }).click();
  await page.getByRole("button", { name: "Importar de outro curso" }).click();
  const dialog = page.getByRole("dialog", { name: "Importar questionário de outro curso" });
  await escolherCursoDeOrigem(dialog);
  await dialog.getByRole("combobox", { name: "Prender ao conteúdo" }).click();
  await page.getByRole("option", { name: TARGET_LESSON.title }).click();
  await expect(dialog.getByText(/sai sem prazo de encerramento/)).toBeVisible();
  await dialog.getByRole("button", { name: "Importar", exact: true }).click();

  await expect.poll(avisosDoAluno).toEqual([
    expect.stringMatching(new RegExp(`^new_quiz: ${TARGET_COURSE_TITLE}: ${TARGET_LESSON.title}`)),
  ]);
});
