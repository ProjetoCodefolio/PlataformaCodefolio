import { test, expect } from "./support/test";
import { resetDatabase, readDatabase } from "./support/emulator";
import { resetAuth, createAuthUser, loginAs } from "./support/auth";
import { installYouTubeStub, waitForPlayer, watchVideo } from "./support/youtubeStub";
import { videosScenario, ALUNO, VIDEO_COURSE_ID, VIDEO_1, VIDEO_2 } from "./fixtures/videos";

// Assistir um vídeo: o progresso sai do player (aqui, o falso), é salvo no
// banco, vale "assistido" a partir de 90% e destrava o vídeo seguinte, que
// exige o anterior.

let aluno;

test.beforeEach(async ({ page }) => {
  await resetAuth();
  aluno = await createAuthUser(ALUNO);
  await resetDatabase(videosScenario({ alunoId: aluno.uid }));
  await installYouTubeStub(page);
  await loginAs(page, aluno);
  await page.goto(`/classes?courseId=${VIDEO_COURSE_ID}`);
  await waitForPlayer(page, VIDEO_1.youtubeId);
});

const videoProgress = (videoId) =>
  readDatabase(`videoProgress/${aluno.uid}/${VIDEO_COURSE_ID}/${videoId}`);

test("assistir 90% do vídeo marca assistido, sobe o progresso do curso e destrava o próximo", async ({
  page,
}) => {
  await expect(page.getByRole("button", { name: "Bloqueado" })).toBeVisible();

  await watchVideo(page, { percent: 95 });

  await expect(page.getByText("Progresso do vídeo salvo com sucesso!")).toBeVisible();
  await expect(page.getByRole("button", { name: "Bloqueado" })).toBeHidden();
  await expect(page.getByRole("button", { name: "Assistir" })).toBeVisible();

  expect(await videoProgress(VIDEO_1.id)).toMatchObject({ watched: true, completed: false });
  await expect
    .poll(() => readDatabase(`studentCourses/${aluno.uid}/${VIDEO_COURSE_ID}`))
    .toMatchObject({ progress: 50, status: "in_progress" });

  await page.getByRole("button", { name: "Assistir" }).click();
  await waitForPlayer(page, VIDEO_2.youtubeId);
});

test("o vídeo destravado continua destravado depois de recarregar a página", async ({ page }) => {
  await watchVideo(page, { percent: 95 });
  await expect(page.getByRole("button", { name: "Assistir" })).toBeVisible();

  await page.reload();

  await expect(page.getByRole("heading", { name: VIDEO_2.title })).toBeVisible();
  await expect(page.getByRole("button", { name: "Bloqueado" })).toBeHidden();
});

test("assistir menos de 90% salva o progresso mas não destrava o próximo", async ({ page }) => {
  await watchVideo(page, { percent: 50 });

  await expect.poll(() => videoProgress(VIDEO_1.id)).toMatchObject({
    percentageWatched: 50,
    watched: false,
  });
  await expect(page.getByRole("button", { name: "Bloqueado" })).toBeVisible();
});
