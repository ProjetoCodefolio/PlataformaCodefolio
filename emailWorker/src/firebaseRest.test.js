import { describe, it, expect, vi } from "vitest";
import { exportPKCS8, exportSPKI, generateKeyPair, importSPKI, jwtVerify } from "jose";
import { createServiceAccountAuth, dbFromEnv } from "./firebaseRest.js";

const { publicKey, privateKey } = await generateKeyPair("RS256", { extractable: true });
const conta = {
  client_email: "cron@plataformacodefolio.iam.gserviceaccount.com",
  private_key: await exportPKCS8(privateKey),
  private_key_id: "chave1",
};

const googleOk = (token = "token-1", expiresIn = 3600) =>
  vi.fn(async () => new Response(JSON.stringify({ access_token: token, expires_in: expiresIn })));

describe("createServiceAccountAuth", () => {
  it("assina o JWT da conta de serviço e troca por token do Google", async () => {
    const fetchImpl = googleOk();
    const auth = createServiceAccountAuth(JSON.stringify(conta), { fetchImpl });

    expect(await auth()).toBe("Bearer token-1");

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://oauth2.googleapis.com/token");
    const corpo = new URLSearchParams(init.body);
    expect(corpo.get("grant_type")).toBe("urn:ietf:params:oauth:grant-type:jwt-bearer");

    const chavePublica = await importSPKI(await exportSPKI(publicKey), "RS256");
    const { payload, protectedHeader } = await jwtVerify(corpo.get("assertion"), chavePublica, {
      issuer: conta.client_email,
      audience: "https://oauth2.googleapis.com/token",
    });
    expect(payload.sub).toBe(conta.client_email);
    expect(payload.scope).toContain("https://www.googleapis.com/auth/firebase.database");
    expect(protectedHeader.kid).toBe("chave1");
  });

  it("reaproveita o token até perto de expirar e renova depois", async () => {
    let agora = 1_000_000;
    const fetchImpl = googleOk();
    const auth = createServiceAccountAuth(conta, { fetchImpl, now: () => agora });

    await auth();
    agora += 30 * 60 * 1000;
    await auth();
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    agora += 30 * 60 * 1000;
    await auth();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("recusa do Google vira erro com o motivo; chave inválida falha cedo", async () => {
    const recusa = vi.fn(async () => new Response("invalid_grant", { status: 400 }));
    await expect(createServiceAccountAuth(conta, { fetchImpl: recusa })()).rejects.toThrow(
      /400 invalid_grant/
    );
    expect(() => createServiceAccountAuth({ client_email: "x" })).toThrow(/Conta de serviço inválida/);
  });
});

describe("dbFromEnv", () => {
  it("sem URL do banco ou sem conta de serviço, o cron não tem banco", () => {
    expect(dbFromEnv({})).toBeNull();
    expect(dbFromEnv({ FIREBASE_DATABASE_URL: "https://x.firebaseio.com" })).toBeNull();
  });

  it("com a conta de serviço, as chamadas ao banco levam o token", async () => {
    const chamadas = [];
    const fetchImpl = vi.fn(async (url, init) => {
      chamadas.push({ url: String(url), auth: init.headers?.Authorization });
      if (String(url).startsWith("https://oauth2")) {
        return new Response(JSON.stringify({ access_token: "tk", expires_in: 3600 }));
      }
      return new Response("null");
    });
    const db = dbFromEnv(
      {
        FIREBASE_DATABASE_URL: "https://plataformacodefolio-default-rtdb.firebaseio.com",
        FIREBASE_SERVICE_ACCOUNT: JSON.stringify(conta),
      },
      fetchImpl
    );

    await db.get("publicationQueue");

    const leitura = chamadas.find((c) => c.url.includes("firebaseio.com"));
    expect(leitura.url).toBe("https://plataformacodefolio-default-rtdb.firebaseio.com/publicationQueue.json");
    expect(leitura.auth).toBe("Bearer tk");
  });
});
