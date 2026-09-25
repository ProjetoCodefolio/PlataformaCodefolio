// Acesso ao Realtime Database pelo REST, para o cron do Worker.
//
// O Worker não tem o SDK do Firebase: fala direto com a API REST. A URL do
// banco vem de `FIREBASE_DATABASE_URL` e pode trazer `?ns=` (emulador local).
//
// Autenticação:
//  - emulador (`FIREBASE_AUTH=emulator`): `Authorization: Bearer owner`, que o
//    emulador aceita como administrador;
//  - produção: conta de serviço (ainda não configurada; ver
//    plano_notificacao_publicacao.md, seção 3). Sem ela o cron não roda.

export class PreconditionFailed extends Error {}

/**
 * @param {Object} options
 * @param {string} options.databaseUrl - ex.: https://x.firebaseio.com ou http://127.0.0.1:9000?ns=x
 * @param {() => Promise<string>} options.getAuthHeader - valor do header Authorization
 * @param {typeof fetch} [options.fetchImpl]
 */
export const createDb = ({ databaseUrl, getAuthHeader, fetchImpl = fetch }) => {
  const base = new URL(databaseUrl);
  const root = `${base.origin}${base.pathname.replace(/\/$/, "")}`;

  const urlFor = (path, params = {}) => {
    const url = new URL(`${root}/${path}.json`);
    base.searchParams.forEach((value, key) => url.searchParams.set(key, value));
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    return url.toString();
  };

  const request = async (method, path, { body, params, headers = {} } = {}) => {
    const response = await fetchImpl(urlFor(path, params), {
      method,
      headers: {
        Authorization: await getAuthHeader(),
        ...(body !== undefined && { "content-type": "application/json" }),
        ...headers,
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });
    if (response.status === 412) throw new PreconditionFailed(path);
    if (!response.ok) {
      throw new Error(`RTDB ${method} ${path}: ${response.status} ${await response.text()}`);
    }
    return response;
  };

  return {
    /** Lê um caminho. `params` vai na query (orderBy/endAt já em JSON). */
    async get(path, params) {
      return (await request("GET", path, { params })).json();
    },
    /** Lê junto com o ETag, para gravar depois só se ninguém mexeu no meio. */
    async getWithEtag(path) {
      const response = await request("GET", path, { headers: { "X-Firebase-ETag": "true" } });
      return { value: await response.json(), etag: response.headers.get("etag") };
    },
    /** Grava; com `ifMatch`, falha com PreconditionFailed se o valor mudou. */
    async put(path, value, { ifMatch } = {}) {
      await request("PUT", path, {
        body: value,
        ...(ifMatch && { headers: { "if-match": ifMatch } }),
      });
    },
    /** Cria um filho com chave gerada (push). */
    async post(path, value) {
      return (await request("POST", path, { body: value })).json();
    },
    /** Apaga; com `ifMatch`, falha com PreconditionFailed se o valor mudou. */
    async remove(path, { ifMatch } = {}) {
      await request("DELETE", path, ifMatch ? { headers: { "if-match": ifMatch } } : {});
    },
  };
};

/**
 * Monta o acesso ao banco a partir do `env` do Worker, ou null quando o banco
 * não está configurado (o cron então não faz nada).
 */
export const dbFromEnv = (env, fetchImpl = fetch) => {
  if (!env.FIREBASE_DATABASE_URL) return null;
  if (env.FIREBASE_AUTH === "emulator") {
    return createDb({
      databaseUrl: env.FIREBASE_DATABASE_URL,
      getAuthHeader: async () => "Bearer owner",
      fetchImpl,
    });
  }
  // Conta de serviço: próximo passo do plano. Até lá, sem banco.
  console.warn("FIREBASE_AUTH sem suporte ainda: configure a conta de serviço.");
  return null;
};
