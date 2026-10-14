import { readFile } from "node:fs/promises";
// O jszip vem junto com a biblioteca `docx` (dependência dela); aqui só abre o
// .docx baixado para ler o texto do documento.
import JSZip from "jszip";
import { test, expect } from "./support/test";
import { resetDatabase } from "./support/emulator";
import { resetAuth, createAuthUser, loginAs } from "./support/auth";
import { videosScenario, VIDEO_COURSE_ID, VIDEO_1, VIDEO_2 } from "./fixtures/videos";
import { asTeacher, PROFESSORA } from "./fixtures/teacher";

// Exportação das dúvidas (plano_exportacao_duvidas.md): o professor escolhe
// dúvidas na aba "Dúvidas" e baixa a planilha (com autor, para ele) ou monta a
// lista de exercícios (sem autor, para a turma). O que estes testes protegem:
//  - só as dúvidas escolhidas saem, e a planilha leva o autor;
//  - a lista NUNCA leva o nome de quem perguntou, nem na prévia nem no arquivo;
//  - a ordem inicial segue o curso, e o que o professor edita e reordena na
//    prévia é o que sai no .docx.

const DUVIDAS = {
  "e2e-duvida-1": {
    contentId: VIDEO_2.id,
    contentTitle: VIDEO_2.title,
    text: "Por que o JOIN duplicou as linhas?",
    userId: "e2e-aluno-maria",
    userName: "Maria Silva",
    userPhotoURL: "",
    createdAt: "2026-10-14T13:00:00.000Z",
    discussed: false,
    discussedAt: null,
  },
  "e2e-duvida-2": {
    contentId: VIDEO_1.id,
    contentTitle: VIDEO_1.title,
    text: "O que é uma chave estrangeira?",
    userId: "e2e-aluno-joao",
    userName: "João Souza",
    userPhotoURL: "",
    createdAt: "2026-10-13T13:00:00.000Z",
    discussed: true,
    discussedAt: "2026-10-14T18:00:00.000Z",
  },
  "e2e-duvida-3": {
    contentId: VIDEO_1.id,
    contentTitle: VIDEO_1.title,
    text: "Toda tabela precisa de chave primária?",
    userId: "e2e-aluno-ana",
    userName: "Ana Lima",
    userPhotoURL: "",
    createdAt: "2026-10-12T13:00:00.000Z",
    discussed: false,
    discussedAt: null,
  },
};
const AUTORES = ["Maria Silva", "João Souza", "Ana Lima"];

test.beforeEach(async ({ page }) => {
  await resetAuth();
  const professora = await createAuthUser(PROFESSORA);
  const scenario = asTeacher(videosScenario({ alunoId: "e2e-aluno-sem-conta" }), professora.uid);
  await resetDatabase({ ...scenario, courseQuestions: { [VIDEO_COURSE_ID]: DUVIDAS } });

  await loginAs(page, professora);
  await page.goto(`/adm-cursos?courseId=${VIDEO_COURSE_ID}`);
  await page.getByRole("tab", { name: "Dúvidas" }).click();
  await expect(page.getByRole("checkbox", { name: "Escolher a dúvida de Ana Lima" })).toBeVisible();
});

test("a planilha leva só as dúvidas escolhidas, com o autor", async ({ page }) => {
  const exportar = page.getByRole("button", { name: "Planilha" });
  await expect(exportar).toBeDisabled();

  await page.getByRole("checkbox", { name: "Escolher a dúvida de Maria Silva" }).check();
  await page.getByRole("checkbox", { name: "Escolher a dúvida de João Souza" }).check();
  await expect(page.getByText("2 dúvidas escolhidas para exportar.")).toBeVisible();

  const [download] = await Promise.all([page.waitForEvent("download"), exportar.click()]);
  expect(download.suggestedFilename()).toMatch(new RegExp(`^duvidas_${VIDEO_COURSE_ID}_\\d{4}-\\d{2}-\\d{2}\\.csv$`));

  const csv = (await readFile(await download.path(), "utf8")).replace(/^\ufeff/, "");
  const linhas = csv.split("\n");
  expect(linhas[0]).toBe('"Conteúdo","Dúvida","Autor","Registrada em","Situação","Discutida em"');
  expect(linhas).toHaveLength(3);
  expect(csv).toContain('"Maria Silva"');
  expect(csv).toContain('"João Souza","13/10/2026, 10:00","Discutida","14/10/2026, 15:00"');
  expect(csv).not.toContain("Ana Lima");
});

test("a lista de exercícios sai sem autor, na ordem do curso, com o que o professor editou", async ({
  page,
}) => {
  await page.getByRole("checkbox", { name: "Marcar todas as dúvidas visíveis" }).check();
  await page.getByRole("button", { name: "Lista de exercícios" }).click();

  const previa = page.getByRole("dialog", { name: "Lista de exercícios" });
  await expect(previa).toBeVisible();
  const exercicio = (n) => previa.getByRole("textbox", { name: `Exercício ${n}`, exact: true });
  await expect(previa.getByLabel("Nome do curso")).toHaveValue("Curso de Vídeos E2E");

  // Ordem do curso: as duas da Aula 1 (por data) e depois a da Aula 2.
  await expect(exercicio(1)).toHaveValue(DUVIDAS["e2e-duvida-3"].text);
  await expect(exercicio(2)).toHaveValue(DUVIDAS["e2e-duvida-2"].text);
  await expect(exercicio(3)).toHaveValue(DUVIDAS["e2e-duvida-1"].text);
  for (const autor of AUTORES) {
    await expect(previa.getByText(autor)).toHaveCount(0);
  }

  await previa.getByLabel("Título da lista").fill("Lista 1: Modelagem");
  await exercicio(3).fill("Explique por que um JOIN pode duplicar linhas.");
  await previa.getByRole("button", { name: "Descer o exercício 1" }).click();
  await previa.getByRole("button", { name: "Tirar o exercício 2 da lista" }).click();
  await previa.getByRole("checkbox", { name: "Mostrar o conteúdo de cada exercício" }).check();

  const [docx] = await Promise.all([
    page.waitForEvent("download"),
    previa.getByRole("button", { name: "Baixar .docx" }).click(),
  ]);
  expect(docx.suggestedFilename()).toBe("lista-1-modelagem.docx");
  const zip = await JSZip.loadAsync(await readFile(await docx.path()));
  const xml = await zip.file("word/document.xml").async("string");
  const texto = xml.replace(/<[^>]+>/g, "");

  expect(texto).toContain("Lista 1: Modelagem");
  expect(texto).toContain(`1. ${DUVIDAS["e2e-duvida-2"].text}`);
  expect(texto).toContain("2. Explique por que um JOIN pode duplicar linhas.");
  expect(texto).toContain(`Referente a: ${VIDEO_2.title}`);
  expect(texto).not.toContain(DUVIDAS["e2e-duvida-3"].text);
  for (const autor of AUTORES) expect(texto).not.toContain(autor);

  const [pdf] = await Promise.all([
    page.waitForEvent("download"),
    previa.getByRole("button", { name: "Baixar PDF" }).click(),
  ]);
  expect(pdf.suggestedFilename()).toBe("lista-1-modelagem.pdf");
  expect((await readFile(await pdf.path())).subarray(0, 5).toString()).toBe("%PDF-");
});
