import { test as base, expect } from "@playwright/test";

// `test` de todos os arquivos E2E. Importe daqui, não de @playwright/test.
//
// Duas garantias valem para todo teste, sem o teste precisar pedir:
//  - nada sai para a internet: só localhost e 127.0.0.1 respondem, o resto é
//    abortado (Groq, Worker de e-mail, YouTube, Google Fonts...). Um teste não
//    pode depender de serviço externo, e muito menos acionar um. Por isso não
//    há teste do botão "Entrar com Google": o popup precisa de apis.google.com
//    e unpkg.com (ver plano_testes_e2e.md), e o login entra pelo atalho de
//    support/auth.js;
//  - erro de JavaScript não tratado na página reprova o teste, mesmo que a
//    tela pareça certa. É o tipo de quebra que um teste de tela deixa passar.

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.context().route("**/*", (route) => {
      const { hostname, protocol } = new URL(route.request().url());
      const local = LOCAL_HOSTS.has(hostname) || protocol === "data:" || protocol === "blob:";
      return local ? route.continue() : route.abort("blockedbyclient");
    });

    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error));

    await use(page);

    expect(pageErrors, "erros de JavaScript não tratados na página").toEqual([]);
  },
});

export { expect };
