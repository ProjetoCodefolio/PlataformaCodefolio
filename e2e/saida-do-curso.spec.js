import { test, expect } from "./support/test";
import { resetDatabase, readDatabase, writeDatabase } from "./support/emulator";
import { resetAuth, createAuthUser, loginAs } from "./support/auth";
import { asTeacher, PROFESSORA } from "./fixtures/teacher";
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

test.describe("aluno", () => {
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
});

test.describe("professor", () => {
  // Turma do curso aberto: Carla está na turma, Davi saiu por conta própria e
  // Diego é professor da turma (aluno promovido).
  const CARLA = "e2e-carla";
  const DAVI = "e2e-davi";
  let professora;
  let diego;

  const DIEGO = { email: "diego.e2e@example.com", displayName: "Diego Prof" };

  test.beforeEach(async () => {
    await resetAuth();
    professora = await createAuthUser(PROFESSORA);
    diego = await createAuthUser(DIEGO);
    const cenario = asTeacher(accessScenario({ alunoId: "e2e-aluno-sem-conta" }), professora.uid);
    cenario.users[CARLA] = { firstName: "Carla", lastName: "Dias", email: "carla@example.com" };
    cenario.users[DAVI] = { firstName: "Davi", lastName: "Reis", email: "davi@example.com" };
    cenario.users[diego.uid] = {
      firstName: "Diego",
      lastName: "Prof",
      email: DIEGO.email,
      coursesTeacher: { [OPEN_COURSE_ID]: true },
    };
    cenario.studentCourses = {
      [CARLA]: { [OPEN_COURSE_ID]: matricula() },
      [DAVI]: { [OPEN_COURSE_ID]: encerrada() },
      [diego.uid]: { [OPEN_COURSE_ID]: matricula() },
    };
    await resetDatabase(cenario);
  });

  const linha = (page, nome) => page.getByRole("row").filter({ hasText: nome });
  const abaAlunos = (page) => page.goto(`/adm-cursos?courseId=${OPEN_COURSE_ID}&tab=3`);

  test("a dona remove uma aluna, que vai para o fim marcada, e depois a readmite", async ({ page }) => {
    await loginAs(page, professora);
    await abaAlunos(page);

    // Quem saiu por conta própria aparece no fim, marcado, sem "Readmitir".
    const linhas = page.getByRole("row");
    await expect(linhas.last()).toContainText("Davi Reis");
    await expect(linha(page, "Davi Reis")).toContainText("Saiu da turma");
    await expect(linha(page, "Davi Reis").getByRole("button", { name: "Readmitir" })).toHaveCount(0);

    await linha(page, "Carla Dias").getByRole("button", { name: "Remover da turma" }).click();
    const dialogo = page.getByRole("dialog", { name: "Remover Carla Dias da turma?" });
    await expect(dialogo).toContainText("Em curso aberto, quem foi removido pode voltar quando quiser.");
    await expect(dialogo).not.toContainText("permanentemente");
    await dialogo.getByRole("button", { name: "Remover da turma" }).click();

    await expect(linha(page, "Carla Dias")).toContainText("Removido da turma");
    expect(await readDatabase(`studentCourses/${CARLA}/${OPEN_COURSE_ID}`)).toMatchObject({
      progress: 40,
      endReason: "removed",
      endedBy: professora.uid,
    });
    const avisos = Object.values((await readDatabase(`notifications/${CARLA}`)) || {});
    expect(avisos.map((a) => a.type)).toEqual(["enrollment_changed"]);

    await linha(page, "Carla Dias").getByRole("button", { name: "Readmitir" }).click();
    await expect(linha(page, "Carla Dias")).not.toContainText("Removido da turma");
    expect((await readDatabase(`studentCourses/${CARLA}/${OPEN_COURSE_ID}`)).endedAt).toBeUndefined();
  });

  test("professor da turma não é removível e não troca o papel de ninguém", async ({ page }) => {
    await loginAs(page, professora);
    await abaAlunos(page);
    await expect(
      linha(page, "Diego Prof").getByRole("button", { name: "Remover da turma" })
    ).toBeDisabled();

    await loginAs(page, diego);
    await abaAlunos(page);
    await expect(linha(page, "Carla Dias").getByRole("combobox")).toHaveAttribute("aria-disabled", "true");
    // Mas remove aluno: conduzir a turma inclui isso.
    await expect(
      linha(page, "Carla Dias").getByRole("button", { name: "Remover da turma" })
    ).toBeEnabled();
  });
});
