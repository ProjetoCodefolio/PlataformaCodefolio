// Decide contra o que o app se conecta, a partir das variáveis do Vite. Fica
// separado de firebase.js para poder ser testado sem inicializar o Firebase.
//
// Os três modos:
//  - local (`npm run dev`): banco no emulador, login com o Google real;
//  - produção (`vite build` com VITE_MODE=production): tudo real;
//  - e2e (`npm run build:e2e`): banco E login no emulador, mesmo sendo um
//    build. É o único modo em que o login vai para o emulador, porque lá o
//    popup do Google vira a tela falsa que o Playwright consegue preencher.

export const E2E_MODE = "e2e";

export const resolveRuntimeMode = (env) => {
  const e2e = env.VITE_MODE === E2E_MODE;
  // `env.DEV` só é true no dev server, nunca em `vite build`. Sem VITE_MODE,
  // o dev server vai para o emulador; VITE_MODE=production tira o emulador da
  // jogada mesmo em dev, para testar o dev server contra o Firebase real.
  const useDatabaseEmulator = e2e || (env.VITE_MODE !== "production" && Boolean(env.DEV));
  return {
    e2e,
    useDatabaseEmulator,
    useAuthEmulator: e2e,
  };
};

// E-mail de notificação só sai de um build de verdade (`env.PROD`), nunca do
// dev server, para teste local contra o Firebase real não mandar e-mail para
// aluno de verdade. VITE_FORCE_EMAIL_NOTIFICATIONS liga em dev para teste
// pontual (ver notifications.js). O build e2e também é um build, mas não manda
// e-mail em hipótese nenhuma, nem forçado.
//
// Fica fora de resolveRuntimeMode de propósito: cada função é chamada de um
// lugar só (esta em notifications.js, a outra em firebase.js), e é isso que
// deixa o Vite calcular o resultado na hora do build e apagar do build de
// produção todo o código que só serve ao e2e. Com as duas chamadas na mesma
// função, o emulador e o atalho de login voltavam para o build de produção.
// O scripts/checkProductionBuild.mjs reprova o build se isso acontecer.
export const resolveEmailNotificationsEnabled = (env) =>
  env.VITE_MODE !== E2E_MODE &&
  (Boolean(env.PROD) || env.VITE_FORCE_EMAIL_NOTIFICATIONS === "true");

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

export const isLocalHostname = (hostname) => LOCAL_HOSTNAMES.has(hostname);
