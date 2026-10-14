import { test as base, expect } from "@playwright/test";

// `test` dos testes de smoke. Importe daqui, não de @playwright/test.
//
// Duas garantias valem para todo teste, sem o teste precisar pedir:
//  - nenhum evento sai para o Google Analytics: o robô do CI não é visita, e
//    contar cada deploy como acesso sujaria as métricas de produção. O envio
//    recebe uma resposta vazia em vez de ser abortado, porque requisição
//    abortada vira erro no console e reprovaria o teste;
//  - erro de JavaScript não tratado na página, ou erro no console, reprova o
//    teste, mesmo que a tela pareça certa. Aviso (warning) não reprova: o
//    player do YouTube e o navegador soltam vários que não são do app.

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.context().route(/^https:\/\/[^/]*google-analytics\.com\//, (route) =>
      route.fulfill({ status: 204 })
    );

    const errors = [];
    page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(`console: ${message.text()}`);
    });

    await use(page);

    expect(errors, "erros de JavaScript na página").toEqual([]);
  },
});

export { expect };
