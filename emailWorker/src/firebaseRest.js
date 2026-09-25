// Acesso ao Realtime Database pelo REST, para o cron do Worker.
//
// O Worker não tem o SDK do Firebase: fala direto com a API REST. A URL do
// banco vem de `FIREBASE_DATABASE_URL` e pode trazer `?ns=` (emulador local).
//
// Autenticação:
//  - emulador (`FIREBASE_AUTH=emulator`): `Authorization: Bearer owner`, que o
//    emulador aceita como administrador;
//  - produção: conta de serviço do Firebase (secret FIREBASE_SERVICE_ACCOUNT,
//    o JSON da chave). O Worker assina um JWT com a chave e troca por um token
//    de acesso do Google, que vale uma hora e fica guardado em memória. A conta
//    de serviço passa por cima das regras do banco, como o Admin SDK.

import { SignJWT, importPKCS8 } from "jose";

export class PreconditionFailed extends Error {}

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPES = [
  "https://www.googleapis.com/auth/firebase.database",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

/**
 * Header Authorization a partir da conta de serviço. Reaproveita o token até
 * faltar um minuto para expirar.
 *
 * @param {string|Object} serviceAccount - JSON da chave (client_email, private_key)
 * @param {Object} [options]
 * @param {typeof fetch} [options.fetchImpl]
 * @param {() => number} [options.now] - relógio em ms (testes)
 * @returns {() => Promise<string>}
 */
export const createServiceAccountAuth = (
  serviceAccount,
  { fetchImpl = fetch, now = () => Date.now() } = {}
) => {
  const conta = typeof serviceAccount === "string" ? JSON.parse(serviceAccount) : serviceAccount;
  if (!conta?.client_email || !conta?.private_key) {
    throw new Error("Conta de serviço inválida: faltam client_email ou private_key.");
  }
  let cache = null;

  return async () => {
    if (cache && cache.expiresAt - 60_000 > now()) return `Bearer ${cache.token}`;

    const chave = await importPKCS8(conta.private_key, "RS256");
    const iat = Math.floor(now() / 1000);
    const assertion = await new SignJWT({ scope: SCOPES })
      .setProtectedHeader({ alg: "RS256", typ: "JWT", ...(conta.private_key_id && { kid: conta.private_key_id }) })
      .setIssuer(conta.client_email)
      .setSubject(conta.client_email)
      .setAudience(GOOGLE_TOKEN_URL)
      .setIssuedAt(iat)
      .setExpirationTime(iat + 3600)
      .sign(chave);

    const response = await fetchImpl(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }).toString(),
    });
    if (!response.ok) {
      throw new Error(`Token do Google recusado: ${response.status} ${await response.text()}`);
    }
    const { access_token: token, expires_in: expiresIn } = await response.json();
    cache = { token, expiresAt: now() + Number(expiresIn || 3600) * 1000 };
    return `Bearer ${token}`;
  };
};

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
  if (!env.FIREBASE_SERVICE_ACCOUNT) {
    console.warn("Cron de publicações sem conta de serviço (FIREBASE_SERVICE_ACCOUNT): nada a fazer.");
    return null;
  }
  return createDb({
    databaseUrl: env.FIREBASE_DATABASE_URL,
    getAuthHeader: createServiceAccountAuth(env.FIREBASE_SERVICE_ACCOUNT, { fetchImpl }),
    fetchImpl,
  });
};
