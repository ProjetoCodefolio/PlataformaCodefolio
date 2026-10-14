/* eslint-env node */
import { defineConfig, devices } from "@playwright/test";

// Testes de ponta a ponta (ver plano_testes_e2e.md). Rodam contra o build de
// e2e (`npm run build:e2e`, em dist-e2e/), servido pelo `vite preview`, com o
// banco e o login no emulador do Firebase. Quem sobe o emulador é o
// `npm run test:e2e`, via `firebase emulators:exec`.

const PORT = 4173;
const CI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./e2e",
  // Os testes zeram e semeiam o mesmo banco do emulador; em paralelo, um
  // apagaria os dados do outro.
  workers: 1,
  fullyParallel: false,
  forbidOnly: CI,
  // No CI, uma segunda chance para falha de tempo. Teste que só passa na
  // segunda tentativa aparece como "flaky" no relatório e tem que ser
  // corrigido, não ignorado.
  retries: CI ? 1 : 0,
  reporter: CI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx vite preview --outDir dist-e2e --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !CI,
    timeout: 30_000,
  },
});
