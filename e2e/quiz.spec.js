import { test, expect } from "./support/test";
import { resetDatabase, readDatabase } from "./support/emulator";
import { resetAuth, createAuthUser, loginAs } from "./support/auth";
import { installYouTubeStub, waitForPlayer, watchVideo } from "./support/youtubeStub";
import { ALUNO, VIDEO_COURSE_ID, VIDEO_1 } from "./fixtures/videos";
import { quizScenario, QUIZ } from "./fixtures/quiz";

// Quiz do vídeo: só libera depois de assistir, aprovar destrava o vídeo
// seguinte e a tentativa só conta quando o aluno envia as respostas (ver
// saveQuizResults). Sair no meio não consome nada.

let aluno;

test.beforeEach(async ({ page }) => {
  await resetAuth();
  aluno = await createAuthUser(ALUNO);
  await resetDatabase(quizScenario({ alunoId: aluno.uid }));
  await installYouTubeStub(page);
  await loginAs(page, aluno);
  await page.goto(`/classes?courseId=${VIDEO_COURSE_ID}`);
  await waitForPlayer(page, VIDEO_1.youtubeId);

  await expect(page.getByRole("button", { name: "Quiz Bloqueado" })).toBeVisible();
  await watchVideo(page, { percent: 95 });
  await expect(page.getByRole("button", { name: "Fazer Quiz" })).toBeVisible();
});

const quizResult = () => readDatabase(`quizResults/${aluno.uid}/${VIDEO_COURSE_ID}/${VIDEO_1.id}`);

/** Abre o quiz pelo botão da lista e confirma o aviso de tentativas. */
const startQuiz = async (page, { listButton = "Fazer Quiz", usedAttempts = 0 } = {}) => {
  await page.getByRole("button", { name: listButton }).click();
  const aviso = page.getByRole("dialog", { name: "Este quiz tem tentativas limitadas" });
  await expect(aviso).toContainText(
    `Você tem ${QUIZ.maxAttempts} tentativas neste quiz e já usou ${usedAttempts}.`
  );
  await aviso.getByRole("button", { name: "Começar quiz" }).click();
};

/** Marca uma alternativa por questão, na ordem, e envia. */
const answerAndSubmit = async (page, answers) => {
  for (const [index, answer] of answers.entries()) {
    await expect(page.getByRole("heading", { name: `Questão ${index + 1} de ${answers.length}` })).toBeVisible();
    await page.getByRole("radio", { name: answer, exact: true }).check();
    const last = index === answers.length - 1;
    await page.getByRole("button", { name: last ? "Finalizar" : "Próxima" }).click();
  }
};

const correctAnswers = QUIZ.questions.map((q) => q.correct);
const wrongAnswers = QUIZ.questions.map((q) => q.wrong);

test("aluno aprovado no quiz vê a nota e destrava o vídeo seguinte", async ({ page }) => {
  await expect(page.getByRole("button", { name: "Bloqueado" })).toBeVisible();

  await startQuiz(page);
  await answerAndSubmit(page, correctAnswers);

  await expect(page.getByRole("heading", { name: "Pontuação: 2/2 (100.00%)" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Parabéns, você passou!" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Bloqueado" })).toBeHidden();
  await expect(page.getByRole("button", { name: "Assistir" })).toBeVisible();
  expect(await quizResult()).toMatchObject({ attemptCount: 1, isPassed: true, scorePercentage: 100 });
});

test("aluno reprovado gasta uma tentativa e o vídeo seguinte continua bloqueado", async ({ page }) => {
  await startQuiz(page);
  await answerAndSubmit(page, wrongAnswers);

  await expect(page.getByRole("heading", { name: "Pontuação: 0/2 (0.00%)" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: `Você não atingiu a nota mínima de ${QUIZ.minPercentage}%` })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Bloqueado" })).toBeVisible();
  expect(await quizResult()).toMatchObject({ attemptCount: 1, isPassed: false });
});

test("sair do quiz antes de enviar não gasta tentativa", async ({ page }) => {
  await startQuiz(page);
  await page.getByRole("radio", { name: QUIZ.questions[0].wrong, exact: true }).check();

  await page.getByRole("button", { name: "Ver Vídeo" }).click();

  await expect(page.getByRole("button", { name: "Fazer Quiz" })).toBeVisible();
  expect(await quizResult()).toBeNull();
  // O aviso ao reabrir confirma que nada foi contado.
  await startQuiz(page, { usedAttempts: 0 });
});

test("depois de gastar todas as tentativas o quiz não abre mais", async ({ page }) => {
  await startQuiz(page);
  await answerAndSubmit(page, wrongAnswers);
  await page.getByRole("button", { name: "Voltar ao Vídeo" }).click();

  // Reprovado, o botão continua "Fazer Quiz" (o "Limite Atingido" da lista só
  // aparece para quem já foi aprovado); quem barra é a porta do quiz.
  await startQuiz(page, { usedAttempts: 1 });
  await answerAndSubmit(page, wrongAnswers);
  await page.getByRole("button", { name: "Voltar ao Vídeo" }).click();

  await page.getByRole("button", { name: "Fazer Quiz" }).click();

  await expect(
    page.getByText(`Você já atingiu o limite de ${QUIZ.maxAttempts} tentativas para este quiz.`)
  ).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Este quiz tem tentativas limitadas" })).toBeHidden();
  await expect(page.getByRole("heading", { name: /^Questão 1 de/ })).toBeHidden();
  expect(await quizResult()).toMatchObject({ attemptCount: QUIZ.maxAttempts, isPassed: false });
});
