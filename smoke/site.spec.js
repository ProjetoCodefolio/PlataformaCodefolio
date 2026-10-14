import { test, expect } from "./test";

// O site no ar responde e mostra o que um visitante vê, com os dados reais.
// Só leitura: nenhum teste loga nem grava nada em produção.

test("a página inicial abre e leva ao catálogo pelo menu", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Codefólio");
  // `.last()`: a página inicial monta a Topbar duas vezes (ver
  // e2e/visitante.spec.js).
  await page.getByRole("link", { name: "Cursos" }).last().click();

  await expect(page).toHaveURL(/\/cursos$/);
  await expect(page.getByRole("tab", { name: "Disponíveis" })).toBeVisible();
});

test("o catálogo aberto direto pelo endereço lista cursos para o visitante", async ({ page }) => {
  // Abrir /cursos direto, e não pelo menu, confere também o rewrite do hosting
  // (firebase.json manda toda rota para o index.html).
  await page.goto("/cursos");

  await page.getByRole("tab", { name: "Disponíveis" }).click();

  // Os cursos vêm do banco de produção: confere que a leitura funcionou, sem
  // depender de qual curso existe.
  await expect(page.getByRole("button", { name: "Começar" }).first()).toBeVisible();
});
