import { test, expect } from "./support/test";
import { resetDatabase } from "./support/emulator";
import { catalogScenario, COURSE_TITLE } from "./fixtures/catalog";

test.beforeEach(async () => {
  await resetDatabase(catalogScenario());
});

test("visitante sem login vê o curso na aba Disponíveis do catálogo", async ({ page }) => {
  await page.goto("/cursos");

  await page.getByRole("tab", { name: "Disponíveis" }).click();

  await expect(page.getByText(COURSE_TITLE)).toBeVisible();
  await expect(page.getByRole("button", { name: "Começar" })).toBeVisible();
});

test("visitante abre a página inicial e chega ao catálogo pelo menu", async ({ page }) => {
  await page.goto("/");

  // `.last()` porque hoje a página inicial monta a Topbar duas vezes (uma em
  // pages/dashboard e outra dentro de components/post/Post.jsx), fixas no
  // mesmo lugar: a de Post fica por cima e é a que o usuário clica.
  await page.getByRole("link", { name: "Cursos" }).last().click();

  await expect(page).toHaveURL(/\/cursos$/);
  await expect(page.getByRole("tab", { name: "Disponíveis" })).toBeVisible();
});
