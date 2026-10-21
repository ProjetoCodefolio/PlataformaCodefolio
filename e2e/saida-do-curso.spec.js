import { test, expect } from "./support/test";
import { resetDatabase, readDatabase, writeDatabase } from "./support/emulator";
import { resetAuth, createAuthUser, loginAs } from "./support/auth";
import {
  accessScenario,
  ALUNO,
  OPEN_COURSE_ID,
  CLOSED_COURSE_ID,
  CLOSED_COURSE_PIN,
} from "./fixtures/access";

// Saída do curso e volta (ver plano_saida_do_curso.md). Sair encerra a
// matrícula sem apagar nada; voltar é um ato explícito na entrada do curso.

let aluno;

const matricula = (extra = {}) => ({
  title: "Curso Aberto E2E",
  progress: 40,
  status: "in_progress",
  ...extra,
});

const encerrada = (extra = {}) =>
  matricula({ endedAt: "2026-10-12T15:00:00.000Z", endReason: "left", ...extra });

test.beforeEach(async ({ page }) => {
  await resetAuth();
  aluno = await createAuthUser(ALUNO);
  await resetDatabase(accessScenario({ alunoId: aluno.uid }));
  await loginAs(page, aluno);
});

const card = (page, titulo) =>
  page.locator(".MuiCard-root").filter({ hasText: titulo });

test("aluno sai pelo menu do card, e o curso vai para Disponíveis com o progresso", async ({ page }) => {
  await writeDatabase(`studentCourses/${aluno.uid}/${OPEN_COURSE_ID}`, matricula());

  await page.goto("/cursos");
  await card(page, "Curso Aberto E2E")
    .getByRole("button", { name: "Mais opções de Curso Aberto E2E" })
    .click();
  await page.getByRole("menuitem", { name: /Sair do curso/ }).click();

  const dialogo = page.getByRole("dialog", { name: "Sair de Curso Aberto E2E?" });
  await expect(dialogo.getByText("Seu progresso e seus resultados ficam guardados.", { exact: false })).toBeVisible();
  await expect(dialogo.getByText("PIN", { exact: false })).toBeHidden();
  await dialogo.getByRole("button", { name: "Sair do curso" }).click();

  await expect(page.getByText("Você saiu de Curso Aberto E2E.")).toBeVisible();
  await expect(dialogo).toBeHidden();

  const gravada = await readDatabase(`studentCourses/${aluno.uid}/${OPEN_COURSE_ID}`);
  expect(gravada).toMatchObject({ progress: 40, endReason: "left", endedBy: aluno.uid });
  expect(gravada.endedAt).toBeTruthy();

  await page.getByRole("tab", { name: "Disponíveis" }).click();
  await expect(card(page, "Curso Aberto E2E")).toContainText("Progresso: 40.00%");
});

test("quem saiu volta pela pergunta da entrada, e cancelar devolve ao catálogo", async ({ page }) => {
  await writeDatabase(`studentCourses/${aluno.uid}/${OPEN_COURSE_ID}`, encerrada());

  await page.goto(`/classes?courseId=${OPEN_COURSE_ID}`);
  const pergunta = page.getByRole("dialog", { name: "Voltar para a turma?" });
  await expect(pergunta).toContainText("Você saiu desta turma em 12/10/2026.");
  await pergunta.getByRole("button", { name: "Cancelar" }).click();
  await expect(page).toHaveURL(/\/cursos$/);
  expect((await readDatabase(`studentCourses/${aluno.uid}/${OPEN_COURSE_ID}`)).endedAt).toBeTruthy();

  await page.goto(`/classes?courseId=${OPEN_COURSE_ID}`);
  await page.getByRole("dialog", { name: "Voltar para a turma?" })
    .getByRole("button", { name: "Voltar para a turma" })
    .click();

  await expect(page.getByRole("tab", { name: "Conteúdo" })).toBeVisible();
  const reativada = await readDatabase(`studentCourses/${aluno.uid}/${OPEN_COURSE_ID}`);
  expect(reativada.endedAt).toBeUndefined();
  expect(reativada.progress).toBe(40);
});

test("no curso fechado, a volta passa pelo PIN", async ({ page }) => {
  await writeDatabase(
    `studentCourses/${aluno.uid}/${CLOSED_COURSE_ID}`,
    encerrada({ title: "Curso Fechado E2E", endReason: "removed" })
  );

  await page.goto(`/classes?courseId=${CLOSED_COURSE_ID}`);
  await expect(page.getByText("Você foi removido desta turma em 12/10/2026.", { exact: false })).toBeVisible();
  await page.getByLabel("PIN de Acesso").fill(CLOSED_COURSE_PIN);
  await page.getByRole("button", { name: "Enviar" }).click();

  await expect(page.getByRole("tab", { name: "Conteúdo" })).toBeVisible();
  expect((await readDatabase(`studentCourses/${aluno.uid}/${CLOSED_COURSE_ID}`)).endedAt).toBeUndefined();
});

test("disciplina encerrada não deixa sair nem voltar", async ({ page }) => {
  await writeDatabase(`courses/${OPEN_COURSE_ID}/type`, "disciplina");
  await writeDatabase(`courses/${OPEN_COURSE_ID}/closedAt`, "2026-12-10T12:00:00.000Z");
  await writeDatabase(`courses/${CLOSED_COURSE_ID}/type`, "disciplina");
  await writeDatabase(`courses/${CLOSED_COURSE_ID}/closedAt`, "2026-12-10T12:00:00.000Z");
  await writeDatabase(`studentCourses/${aluno.uid}/${OPEN_COURSE_ID}`, matricula({ status: "completed" }));
  await writeDatabase(
    `studentCourses/${aluno.uid}/${CLOSED_COURSE_ID}`,
    encerrada({ title: "Curso Fechado E2E" })
  );

  await page.goto("/cursos");
  await page.getByRole("tab", { name: "Concluídos" }).click();
  await card(page, "Curso Aberto E2E")
    .getByRole("button", { name: "Mais opções de Curso Aberto E2E" })
    .click();
  const item = page.getByRole("menuitem", { name: /Sair do curso/ });
  await expect(item).toHaveAttribute("aria-disabled", "true");
  await expect(item).toContainText("Disciplina encerrada");
  await page.keyboard.press("Escape");

  await page.goto(`/classes?courseId=${CLOSED_COURSE_ID}`);
  await expect(page.getByText("A disciplina já foi encerrada", { exact: false })).toBeVisible();
  await expect(page.getByLabel("PIN de Acesso")).toBeHidden();
  await page.getByRole("button", { name: "Voltar para os cursos" }).click();
  await expect(page).toHaveURL(/\/cursos$/);
});
