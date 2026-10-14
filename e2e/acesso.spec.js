import { test, expect } from "./support/test";
import { resetDatabase, writeDatabase } from "./support/emulator";
import { resetAuth, createAuthUser, loginAs } from "./support/auth";
import {
  accessScenario,
  ALUNO,
  OPEN_COURSE_ID,
  CLOSED_COURSE_ID,
  CLOSED_COURSE_PIN,
} from "./fixtures/access";

// Porta de entrada da sala (useCourseAccess): curso aberto entra direto; curso
// fechado pede o PIN a quem ainda não está matriculado.

let aluno;

test.beforeEach(async ({ page }) => {
  await resetAuth();
  aluno = await createAuthUser(ALUNO);
  await resetDatabase(accessScenario({ alunoId: aluno.uid }));
  await loginAs(page, aluno);
});

const pinModal = (page) =>
  page.getByText("Você está tentando acessar um curso que requer uma chave de acesso");

test("aluno entra em curso aberto sem PIN", async ({ page }) => {
  await page.goto(`/classes?courseId=${OPEN_COURSE_ID}`);

  await expect(page.getByRole("tab", { name: "Conteúdo" })).toBeVisible();
  await expect(pinModal(page)).toBeHidden();
});

test("curso fechado recusa o PIN errado e libera com o certo", async ({ page }) => {
  await page.goto(`/classes?courseId=${CLOSED_COURSE_ID}`);
  await expect(pinModal(page)).toBeVisible();

  const campo = page.getByLabel("PIN de Acesso");
  await campo.fill("0000");
  await page.getByRole("button", { name: "Enviar" }).click();
  await expect(page.getByText("PIN incorreto. Tente novamente.")).toBeVisible();
  await expect(page.getByRole("tab", { name: "Conteúdo" })).toBeHidden();

  await campo.fill(CLOSED_COURSE_PIN);
  await page.getByRole("button", { name: "Enviar" }).click();
  await expect(pinModal(page)).toBeHidden();
  await expect(page.getByRole("tab", { name: "Conteúdo" })).toBeVisible();
});

test("aluno já matriculado entra no curso fechado sem PIN", async ({ page }) => {
  await writeDatabase(`studentCourses/${aluno.uid}/${CLOSED_COURSE_ID}`, {
    progress: 0,
    status: "in_progress",
  });

  await page.goto(`/classes?courseId=${CLOSED_COURSE_ID}`);

  await expect(page.getByRole("tab", { name: "Conteúdo" })).toBeVisible();
  await expect(pinModal(page)).toBeHidden();
});

test("fechar o pedido de PIN sem informar devolve o aluno ao catálogo", async ({ page }) => {
  await page.goto(`/classes?courseId=${CLOSED_COURSE_ID}`);
  await expect(pinModal(page)).toBeVisible();

  await page.keyboard.press("Escape");

  await expect(page).toHaveURL(/\/cursos$/);
});
