// Usuários de teste no emulador de Auth, e login sem o popup do Google.
//
// Cada usuário é criado com e-mail e senha direto no emulador (a API REST do
// emulador aceita qualquer chave). O uid que volta é o que o cenário usa para
// semear `users/{uid}` com o papel (aluno, professor, admin) antes do login.

import { PROJECT_ID } from "./emulator";

const AUTH_HOST = `http://127.0.0.1:${process.env.FIREBASE_AUTH_EMULATOR_PORT || 9099}`;
const PASSWORD = "senha-e2e-123";

/** Apaga todas as contas do emulador de Auth. */
export const resetAuth = async () => {
  const response = await fetch(`${AUTH_HOST}/emulator/v1/projects/${PROJECT_ID}/accounts`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error(`Emulador de Auth: limpar contas respondeu ${response.status}`);
};

/** Cria uma conta e devolve `{ uid, email }`. */
export const createAuthUser = async ({ email, displayName }) => {
  const response = await fetch(
    `${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=e2e-fake-api-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: PASSWORD, displayName, returnSecureToken: true }),
    }
  );
  if (!response.ok) {
    throw new Error(`Emulador de Auth: criar ${email} respondeu ${response.status}`);
  }
  const { localId } = await response.json();
  return { uid: localId, email };
};

/**
 * Loga `user` na página aberta, pelo atalho que só existe no build e2e
 * (`window.__codefolioE2E`, ver src/api/config/firebase.js). Abre `/` se a
 * página ainda não tiver carregado o app.
 */
export const loginAs = async (page, user) => {
  if (!page.url().startsWith("http")) await page.goto("/");
  await page.waitForFunction(() => Boolean(window.__codefolioE2E));
  await page.evaluate(
    ({ email, password }) => window.__codefolioE2E.signIn(email, password),
    { email: user.email, password: PASSWORD }
  );
};
