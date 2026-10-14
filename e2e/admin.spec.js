import { test, expect } from "./support/test";
import { resetDatabase } from "./support/emulator";
import { resetAuth, createAuthUser, loginAs } from "./support/auth";
import { catalogScenario } from "./fixtures/catalog";

// Portas das telas de gestão (AdminRoute e TeacherRoute, em App.jsx):
// /admin-panel é só do admin; /adm-cursos (criar e editar curso) é do
// professor e do admin. Quem não pode é mandado para o /dashboard.

const PAINEL_ADMIN = "/admin-panel";
const GERENCIAR_CURSO = "/adm-cursos";

const PERFIS = {
  admin: { conta: { email: "admin.e2e@example.com", displayName: "Admin E2E" }, role: "admin" },
  professora: {
    conta: { email: "outra.professora.e2e@example.com", displayName: "Professora E2E" },
    role: "teacher",
  },
  aluno: { conta: { email: "aluno.e2e@example.com", displayName: "Aluno E2E" }, role: null },
};

/** Cria a conta do perfil, semeia o papel dela e loga. */
const entrarComo = async (page, perfil) => {
  const { conta, role } = PERFIS[perfil];
  await resetAuth();
  const user = await createAuthUser(conta);
  const scenario = catalogScenario();
  scenario.users[user.uid] = {
    firstName: conta.displayName.split(" ")[0],
    lastName: "E2E",
    email: conta.email,
    ...(role ? { role } : {}),
  };
  await resetDatabase(scenario);
  await loginAs(page, user);
};

const painelAdminCarregou = (page) =>
  expect(page.getByRole("heading", { name: "Gerenciamento de Usuários" })).toBeVisible();
const gerenciarCursoCarregou = (page) =>
  expect(page.getByRole("heading", { name: "Criar Novo Curso" })).toBeVisible();

test("o admin abre o painel de administração e a tela de criar curso", async ({ page }) => {
  await entrarComo(page, "admin");

  await page.goto(PAINEL_ADMIN);
  await painelAdminCarregou(page);
  await expect(page).toHaveURL(new RegExp(`${PAINEL_ADMIN}$`));

  await page.goto(GERENCIAR_CURSO);
  await gerenciarCursoCarregou(page);
  await expect(page).toHaveURL(new RegExp(`${GERENCIAR_CURSO}$`));
});

test("a professora abre a tela de criar curso, mas o painel de administração a manda para o início", async ({
  page,
}) => {
  await entrarComo(page, "professora");

  await page.goto(GERENCIAR_CURSO);
  await gerenciarCursoCarregou(page);

  await page.goto(PAINEL_ADMIN);
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Gerenciamento de Usuários" })).toHaveCount(0);
});

test("o aluno é mandado para o início nas duas telas", async ({ page }) => {
  await entrarComo(page, "aluno");

  for (const rota of [PAINEL_ADMIN, GERENCIAR_CURSO]) {
    await page.goto(rota);
    await expect(page).toHaveURL(/\/dashboard$/);
  }
  await expect(page.getByRole("heading", { name: "Gerenciamento de Usuários" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Criar Novo Curso" })).toHaveCount(0);
});
