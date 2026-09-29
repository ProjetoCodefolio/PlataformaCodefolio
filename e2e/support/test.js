import { test as base, expect } from "@playwright/test";

// `test` de todos os arquivos E2E. Importe daqui, não de @playwright/test.
//
// Duas garantias valem para todo teste, sem o teste precisar pedir:
//  - nada sai para a internet: só localhost e 127.0.0.1 respondem, o resto é
//    abortado (Groq, Worker de e-mail, YouTube, Google Fonts...). Um teste não
//    pode depender de serviço externo, e muito menos acionar um. A única
//    exceção é pedida pelo próprio teste, com
//    `test.use({ allowedExternalHosts: [...] })`, e hoje só o teste do botão
//    "Entrar com Google" a usa (ver login.spec.js);
//  - erro de JavaScript não tratado na página reprova o teste, mesmo que a
//    tela pareça certa. É o tipo de quebra que um teste de tela deixa passar.

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export const test = base.extend({
  allowedExternalHosts: [[], { option: true }],

  page: async ({ page, allowedExternalHosts }, use) => {
    const allowed = new Set([...LOCAL_HOSTS, ...allowedExternalHosts]);
    await page.context().route("**/*", (route) => {
      const { hostname, protocol } = new URL(route.request().url());
      const local = allowed.has(hostname) || protocol === "data:" || protocol === "blob:";
      return local ? route.continue() : route.abort("blockedbyclient");
    });

    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error));

    await use(page);

    expect(pageErrors, "erros de JavaScript não tratados na página").toEqual([]);
  },
});

export { expect };
