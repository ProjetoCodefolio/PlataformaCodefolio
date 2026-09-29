// Acesso direto ao emulador do Realtime Database, por fora do app, para
// preparar o cenário de cada teste. `Bearer owner` é o token de administrador
// do emulador: passa por cima das regras de segurança, que continuam valendo
// para tudo o que o app faz.

export const PROJECT_ID = "plataformacodefolio";
const DATABASE_HOST = `http://127.0.0.1:${process.env.FIREBASE_DATABASE_EMULATOR_PORT || 9000}`;
// O app não informa databaseURL, então o SDK usa a instância padrão do
// projeto, que no emulador vira o namespace `<projectId>-default-rtdb`.
const NAMESPACE = `${PROJECT_ID}-default-rtdb`;

const databaseRequest = async (method, path, body) => {
  const response = await fetch(`${DATABASE_HOST}/${path}.json?ns=${NAMESPACE}`, {
    method,
    headers: { Authorization: "Bearer owner", "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Emulador do banco: ${method} /${path} respondeu ${response.status}`);
  }
  return response.json();
};

/** Substitui o banco inteiro por `data` (sem argumento, zera). */
export const resetDatabase = (data = null) => databaseRequest("PUT", "", data);

export const readDatabase = (path = "") => databaseRequest("GET", path);
