import { test, expect } from "./support/test";
import { resetDatabase, readDatabase, writeDatabase } from "./support/emulator";
import { resetAuth, createAuthUser, loginAs } from "./support/auth";
import { videosScenario, ALUNO, VIDEO_COURSE_ID, VIDEO_1, VIDEO_2 } from "./fixtures/videos";
import { asTeacher, PROFESSORA } from "./fixtures/teacher";

// Publicação programada (publication.js): o aluno não vê o item antes da
// data, nem como "em breve". Quem conduz a turma vê, com o selo "Programado".
//
// Sem `page.clock`: o app mede o "agora" pelo relógio do servidor
// (`.info/serverTimeOffset`), justamente para o aluno não liberar o item
// adiantando o relógio do computador, e essa correção anula um relógio falso
// na página. O teste da data chegando usa uma data poucos segundos à frente.

let aluno;
let professora;

test.beforeEach(async () => {
  await resetAuth();
  aluno = await createAuthUser(ALUNO);
  professora = await createAuthUser(PROFESSORA);
  const scenario = asTeacher(videosScenario({ alunoId: aluno.uid }), professora.uid);
  // O segundo vídeo não depende do primeiro: aqui só a data decide se ele aparece.
  scenario.courseContent[VIDEO_COURSE_ID][VIDEO_2.id].requiresPrevious = false;
  await resetDatabase(scenario);
});

const contentCard = (page, title) => page.getByRole("heading", { name: title, exact: true });

test("o aluno não vê o vídeo programado, e ele aparece quando a data chega", async ({ page }) => {
  const publishAt = new Date(Date.now() + 8_000).toISOString();
  await writeDatabase(`courseContent/${VIDEO_COURSE_ID}/${VIDEO_2.id}/publishAt`, publishAt);

  await loginAs(page, aluno);
  await page.goto(`/classes?courseId=${VIDEO_COURSE_ID}`);

  await expect(contentCard(page, VIDEO_1.title)).toBeVisible();
  await expect(contentCard(page, VIDEO_2.title)).toHaveCount(0);

  // Passada a data, o vídeo aparece ao abrir a sala de novo.
  await expect(async () => {
    await page.reload();
    await expect(contentCard(page, VIDEO_2.title)).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 30_000 });
});

test("o professor programa um vídeo pelo formulário: ele vê o selo e o aluno não vê o vídeo", async ({
  page,
}) => {
  await loginAs(page, professora);
  await page.goto(`/adm-cursos?courseId=${VIDEO_COURSE_ID}`);

  await page.getByRole("listitem").filter({ hasText: VIDEO_2.title }).getByRole("button", { name: "Editar" }).click();
  await expect(page.getByRole("heading", { name: "Editar Conteúdo" })).toBeVisible();
  await page.getByLabel("Programar publicação (opcional)").fill("2099-03-10T10:00");
  await page.getByRole("button", { name: "Salvar Alterações" }).click();

  await expect(page.getByText("Conteúdo atualizado com sucesso!")).toBeVisible();
  // 10h em Brasília (o fuso do navegador nos testes) são 13h UTC.
  await expect
    .poll(() => readDatabase(`courseContent/${VIDEO_COURSE_ID}/${VIDEO_2.id}/publishAt`))
    .toBe("2099-03-10T13:00:00.000Z");

  // Quem conduz a turma vê o item programado na sala, com o selo.
  await page.goto(`/classes?courseId=${VIDEO_COURSE_ID}`);
  await expect(contentCard(page, VIDEO_2.title)).toBeVisible();
  await expect(page.getByText(/^Programado · /)).toBeVisible();

  // O aluno, não.
  await loginAs(page, aluno);
  await page.goto(`/classes?courseId=${VIDEO_COURSE_ID}`);
  await expect(contentCard(page, VIDEO_1.title)).toBeVisible();
  await expect(contentCard(page, VIDEO_2.title)).toHaveCount(0);
  await expect(page.getByText(/^Programado · /)).toHaveCount(0);
});
