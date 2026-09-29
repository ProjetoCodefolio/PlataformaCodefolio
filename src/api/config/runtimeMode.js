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
  // E-mail de notificação só sai de um build de verdade (`env.PROD`), nunca
  // do dev server, para teste local contra o Firebase real não mandar e-mail
  // para aluno de verdade. VITE_FORCE_EMAIL_NOTIFICATIONS liga em dev para
  // teste pontual (ver notifications.js). O build e2e também é um build, mas
  // não manda e-mail em hipótese nenhuma, nem forçado.
  const emailNotificationsEnabled =
    !e2e && (Boolean(env.PROD) || env.VITE_FORCE_EMAIL_NOTIFICATIONS === "true");
  return {
    e2e,
    useDatabaseEmulator,
    useAuthEmulator: e2e,
    emailNotificationsEnabled,
  };
};

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

export const isLocalHostname = (hostname) => LOCAL_HOSTNAMES.has(hostname);
