import { describe, it, expect } from "vitest";
import { calcularDiff, diagnosticarStatusDaGroq } from "./syncLlmModels.mjs";

const daGroq = (modelId, extras = {}) => ({
  modelId,
  name: modelId,
  contextWindow: 131072,
  maxCompletionTokens: 65536,
  ownedBy: "quem-seja",
  inputModalities: ["text"],
  outputModalities: ["text"],
  features: ["json_mode", "structured_outputs"],
  activeNaGroq: true,
  ...extras,
});

const canarioOk = (ids) =>
  new Map(ids.map((id) => [id, { ok: true, at: "2026-09-18T00:00:00.000Z", status: 200, errorCode: null, latencyMs: 100 }]));

const noBanco = (entradas) =>
  Object.fromEntries(entradas.map((e, i) => [`-chave${i}`, e]));

describe("calcularDiff - conjuntos", () => {
  it("classifica como novo o modelo que ainda não está no catálogo", () => {
    const { novos, atualizados, aposentados } = calcularDiff(
      {},
      [daGroq("novo-modelo")],
      canarioOk(["novo-modelo"])
    );

    expect(novos).toHaveLength(1);
    expect(novos[0].modelo.modelId).toBe("novo-modelo");
    expect(atualizados).toEqual([]);
    expect(aposentados).toEqual([]);
  });

  it("casa pelo modelId, não pela chave do nó", () => {
    const registros = noBanco([{ modelId: "existente", isActive: true, maxContext: 8192 }]);
    const { novos, atualizados } = calcularDiff(
      registros,
      [daGroq("existente")],
      canarioOk(["existente"])
    );

    expect(novos).toEqual([]);
    expect(atualizados).toHaveLength(1);
    expect(atualizados[0].chave).toBe("-chave0");
  });

  it("aposenta quem sumiu da API, sem apagar", () => {
    const registros = noBanco([{ modelId: "sumido", isActive: true }]);
    const { aposentados } = calcularDiff(registros, [], new Map());

    expect(aposentados).toHaveLength(1);
    expect(aposentados[0]).toMatchObject({
      modelId: "sumido",
      motivo: "ausente na API da Groq",
    });
  });

  it("explica que o modelo continua na API mas não serve", () => {
    const registros = noBanco([{ modelId: "whisper-large-v3", isActive: true }]);
    const { aposentados } = calcularDiff(
      registros,
      [],
      new Map(),
      new Map([["whisper-large-v3", "entrada não é texto (audio)"]])
    );

    expect(aposentados[0].motivo).toContain("entrada não é texto");
    expect(aposentados[0].motivo).not.toContain("ausente na API");
  });

  it("explica a aposentadoria por canário reprovado", () => {
    const registros = noBanco([{ modelId: "sem-cota", isActive: true }]);
    const { aposentados } = calcularDiff(
      registros,
      [],
      new Map([["sem-cota", { ok: false, errorCode: "model_not_found" }]])
    );

    expect(aposentados[0].motivo).toBe("canário falhou: model_not_found");
  });

  it("não aposenta de novo quem já estava inativo", () => {
    const registros = noBanco([{ modelId: "ja-inativo", isActive: false }]);
    expect(calcularDiff(registros, [], new Map()).aposentados).toEqual([]);
  });

  it("descarta o candidato cujo canário falhou", () => {
    const { novos } = calcularDiff(
      {},
      [daGroq("reprovado")],
      new Map([["reprovado", { ok: false, errorCode: "400" }]])
    );

    expect(novos).toEqual([]);
  });
});

describe("calcularDiff - campos gravados", () => {
  it("elege um único padrão, e é o melhor pela política", () => {
    const { novos, vencedor } = calcularDiff(
      {},
      [
        daGroq("groq/compound", { features: ["json_mode"], maxCompletionTokens: 8192 }),
        daGroq("openai/gpt-oss-120b"),
      ],
      canarioOk(["groq/compound", "openai/gpt-oss-120b"])
    );

    expect(vencedor.modelId).toBe("openai/gpt-oss-120b");
    expect(novos.filter((n) => n.campos.isDefault)).toHaveLength(1);
  });

  it("espelha contextWindow no campo legado maxContext", () => {
    const { novos } = calcularDiff({}, [daGroq("m")], canarioOk(["m"]));
    expect(novos[0].campos.maxContext).toBe(131072);
  });

  it("não sobrescreve o nome que o admin renomeou", () => {
    const registros = noBanco([
      { modelId: "m", name: "Nome escolhido pelo admin", isActive: true },
    ]);
    const { atualizados } = calcularDiff(
      registros,
      [daGroq("m", { name: "Nome Da Groq" })],
      canarioOk(["m"])
    );

    expect(atualizados[0].campos.name).toBe("Nome escolhido pelo admin");
  });

  it("não encosta no isActive quando existe overrideIsActive do admin", () => {
    const registros = noBanco([{ modelId: "m", isActive: false, overrideIsActive: false }]);
    const { atualizados } = calcularDiff(registros, [daGroq("m")], canarioOk(["m"]));

    expect("isActive" in atualizados[0].campos).toBe(false);
  });

  it("não aposenta modelo protegido por overrideIsActive", () => {
    const registros = noBanco([{ modelId: "protegido", isActive: true, overrideIsActive: true }]);
    expect(calcularDiff(registros, [], new Map()).aposentados).toEqual([]);
  });

  it("guarda o resultado do canário no registro", () => {
    const { novos } = calcularDiff({}, [daGroq("m")], canarioOk(["m"]));
    expect(novos[0].campos.canary).toMatchObject({ ok: true, status: 200 });
  });

  it("reativa quem voltou a passar, registrando isActive true", () => {
    const registros = noBanco([{ modelId: "voltou", isActive: false }]);
    const { atualizados } = calcularDiff(registros, [daGroq("voltou")], canarioOk(["voltou"]));

    expect(atualizados[0].campos.isActive).toBe(true);
  });

  it("sem nenhum aprovado, não elege padrão nenhum", () => {
    expect(calcularDiff({}, [], new Map()).vencedor).toBeNull();
  });
});

describe("diagnosticarStatusDaGroq", () => {
  // A distinção que importa é uma só: alguém precisa agir agora (chave) ou a
  // próxima execução resolve sozinha (Groq instável, cota estourada).
  it.each([401, 403])("trata %i como problema de credencial, não transitório", (status) => {
    const { causa, acao, transitorio } = diagnosticarStatusDaGroq(status);

    expect(transitorio).toBe(false);
    expect(causa).toMatch(/chave/i);
    expect(acao).toMatch(/VITE_GROQ_API_KEY/);
  });

  it.each([429, 500, 503])("trata %i como transitório", (status) => {
    expect(diagnosticarStatusDaGroq(status).transitorio).toBe(true);
  });

  it("não chama de transitório um status que não sabe explicar", () => {
    expect(diagnosticarStatusDaGroq(418).transitorio).toBe(false);
  });
});
