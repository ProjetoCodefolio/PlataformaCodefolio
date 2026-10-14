import { test, expect } from "./support/test";
import { resetDatabase, readDatabase } from "./support/emulator";
import { resetAuth, createAuthUser, loginAs } from "./support/auth";
import { VIDEO_COURSE_ID, VIDEO_1 } from "./fixtures/videos";
import { quizScenario, QUIZ } from "./fixtures/quiz";
import { asTeacher, PROFESSORA } from "./fixtures/teacher";

// O professor mexe nas questões de um quiz que já existe. Duas regressões que
// esta tela já teve:
//  - identidade da questão: `question.id` é a chave de todo o fluxo; com ids
//    repetidos ou posicionais, editar uma questão valia por todas;
//  - o nó do quiz é regravado inteiro a cada questão salva (set), e uma
//    configuração que ficasse fora do payload (nota mínima, tentativas) sumia.

let professora;
let original;

test.beforeEach(async ({ page }) => {
  await resetAuth();
  professora = await createAuthUser(PROFESSORA);
  await resetDatabase(asTeacher(quizScenario({ alunoId: "e2e-aluno-sem-conta" }), professora.uid));
  original = await readQuiz();

  await loginAs(page, professora);
  await page.goto(`/adm-cursos?courseId=${VIDEO_COURSE_ID}`);
  await page.getByRole("tab", { name: "Quiz" }).click();
  await page.getByRole("button", { name: "Ver questões" }).click();
  await expect(page.getByRole("heading", { name: /^Questões \(2\)/ })).toBeVisible();
});

const readQuiz = () => readDatabase(`courseQuizzes/${VIDEO_COURSE_ID}/${VIDEO_1.id}`);

const quizSettings = ({ minPercentage, allowRetry, maxAttempts }) => ({
  minPercentage,
  allowRetry,
  maxAttempts,
});

test("adicionar uma questão mantém as que já existiam e a configuração do quiz", async ({ page }) => {
  await page.getByRole("button", { name: "Adicionar questões" }).click();
  await page.getByRole("textbox", { name: "Pergunta" }).fill("Quanto é 3 + 3?");
  await page.getByRole("textbox", { name: "Opção 1" }).fill("6");
  await page.getByRole("textbox", { name: "Opção 2" }).fill("7");
  await page.getByRole("button", { name: "Salvar Questão" }).click();

  await expect(page.getByRole("heading", { name: /^Questões \(3\)/ })).toBeVisible();
  await expect.poll(async () => (await readQuiz()).questions.length).toBe(3);

  const quiz = await readQuiz();
  expect(quiz.questions.slice(0, 2)).toEqual(original.questions);
  expect(quiz.questions[2]).toMatchObject({
    question: "Quanto é 3 + 3?",
    options: ["6", "7"],
    correctOption: 0,
  });
  const ids = quiz.questions.map((q) => q.id);
  expect(new Set(ids).size).toBe(3);
  expect(quizSettings(quiz)).toEqual(quizSettings(original));
});

test("editar uma questão na própria lista muda só ela", async ({ page }) => {
  const [primeira, segunda] = QUIZ.questions;
  await page.getByRole("button", { name: "Editar questão" }).nth(1).click();

  const emEdicao = page.getByRole("listitem").filter({
    has: page.getByRole("button", { name: "Fechar edição" }),
  });
  await emEdicao.getByRole("textbox", { name: "Pergunta" }).fill("Qual a capital do Rio Grande do Sul?");
  await emEdicao.getByRole("textbox", { name: "Opção 1" }).fill("Porto Alegre");

  // O salvamento é automático (com espera curta depois da última tecla).
  await expect
    .poll(async () => (await readQuiz()).questions[1].question)
    .toBe("Qual a capital do Rio Grande do Sul?");

  const quiz = await readQuiz();
  expect(quiz.questions).toHaveLength(2);
  expect(quiz.questions[0]).toEqual(original.questions[0]);
  expect(quiz.questions[0].question).toBe(primeira.question);
  expect(quiz.questions[1]).toMatchObject({
    id: segunda.id,
    options: ["Porto Alegre", ...segunda.options.slice(1)],
    correctOption: 0,
  });
  expect(quizSettings(quiz)).toEqual(quizSettings(original));

  // Ao recarregar, a tela mostra o que ficou gravado.
  await page.reload();
  await page.getByRole("tab", { name: "Quiz" }).click();
  await page.getByRole("button", { name: "Ver questões" }).click();
  await expect(page.getByText("Qual a capital do Rio Grande do Sul?")).toBeVisible();
  await expect(page.getByText(primeira.question)).toBeVisible();
});
