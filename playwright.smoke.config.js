/* eslint-env node */
import { defineConfig, devices } from "@playwright/test";

// Smoke pós-deploy (etapa 6 do plano_testes_e2e.md): poucos testes, só de
// leitura e sem login, contra o site no ar. Roda no CI depois do `deploy`;
// à mão, `npm run test:smoke` (ou com SMOKE_URL apontando para outro endereço).
//
// Ao contrário dos testes de e2e/, aqui não há emulador nem build local: quem
// responde é a produção de verdade, com os dados de verdade.

const CI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./smoke",
  workers: 1,
  forbidOnly: CI,
  // A rede de verdade oscila; duas novas chances antes de dizer que o deploy
  // quebrou o site.
  retries: CI ? 2 : 0,
  reporter: CI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.SMOKE_URL || "https://plataformacodefolio.web.app",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
