import { describe, it, expect } from "vitest";
import {
  isModeloApto,
  normalizarModeloDaGroq,
  cadeiaDeModelos,
  ordenarPorPolitica,
  escolherPadrao,
  modeloEstaAtivo,
  modelosAtivos,
  resolverModeloSelecionado,
  janelaDeContexto,
  capacidadeDeSaida,
} from "./llmModelPolicy";

const modelo = (props) => ({ isActive: true, ...props });

describe("modeloEstaAtivo", () => {
  it("considera ativo o modelo com isActive", () => {
    expect(modeloEstaAtivo(modelo({ modelId: "a" }))).toBe(true);
  });

  it("descarta o modelo sem modelId", () => {
    expect(modeloEstaAtivo(modelo({}))).toBe(false);
  });

  it("deixa o overrideIsActive do admin vencer o estado calculado", () => {
    expect(
      modeloEstaAtivo(modelo({ modelId: "a", isActive: true, overrideIsActive: false }))
    ).toBe(false);
    expect(
      modeloEstaAtivo(modelo({ modelId: "a", isActive: false, overrideIsActive: true }))
    ).toBe(true);
  });
});

describe("janelaDeContexto e capacidadeDeSaida", () => {
  it("aceita o campo legado maxContext enquanto o catálogo não é sincronizado", () => {
    expect(janelaDeContexto({ maxContext: 8192 })).toBe(8192);
  });

  it("prefere contextWindow quando os dois existem", () => {
    expect(janelaDeContexto({ maxContext: 8192, contextWindow: 131072 })).toBe(131072);
  });

  it("devolve zero quando o campo de saída ainda não existe", () => {
    expect(capacidadeDeSaida({ modelId: "a" })).toBe(0);
  });
});

describe("escolherPadrao", () => {
  it("devolve null para lista vazia", () => {
    expect(escolherPadrao([])).toBeNull();
  });

  it("devolve null quando não há entrada válida", () => {
    expect(escolherPadrao(null)).toBeNull();
    expect(escolherPadrao(undefined)).toBeNull();
  });

  it("devolve null quando todos os modelos estão inativos", () => {
    const catalogo = [
      modelo({ modelId: "morto-1", isActive: false }),
      modelo({ modelId: "morto-2", isActive: false }),
    ];
    expect(escolherPadrao(catalogo)).toBeNull();
  });

  it("ignora os inativos ao escolher", () => {
    const catalogo = [
      modelo({ modelId: "grande", isActive: false, maxCompletionTokens: 65536 }),
      modelo({ modelId: "vivo", maxCompletionTokens: 8192 }),
    ];
    expect(escolherPadrao(catalogo).modelId).toBe("vivo");
  });

  it("prefere maior capacidade de saída", () => {
    const catalogo = [
      modelo({ modelId: "a", maxCompletionTokens: 8192, contextWindow: 131072 }),
      modelo({ modelId: "b", maxCompletionTokens: 65536, contextWindow: 131072 }),
    ];
    expect(escolherPadrao(catalogo).modelId).toBe("b");
  });

  it("usa a janela de contexto como segundo critério", () => {
    const catalogo = [
      modelo({ modelId: "a", maxCompletionTokens: 8192, contextWindow: 32768 }),
      modelo({ modelId: "b", maxCompletionTokens: 8192, contextWindow: 131072 }),
    ];
    expect(escolherPadrao(catalogo).modelId).toBe("b");
  });

  it("prefere structured_outputs sobre a capacidade de saída", () => {
    const catalogo = [
      modelo({ modelId: "bruto", maxCompletionTokens: 65536 }),
      modelo({
        modelId: "estruturado",
        maxCompletionTokens: 4096,
        features: ["structured_outputs", "json_mode"],
      }),
    ];
    expect(escolherPadrao(catalogo).modelId).toBe("estruturado");
  });

  it("aceita features como objeto além de array", () => {
    const catalogo = [
      modelo({ modelId: "bruto", maxCompletionTokens: 65536 }),
      modelo({
        modelId: "json",
        maxCompletionTokens: 4096,
        features: { json_mode: true, structured_outputs: false },
      }),
    ];
    expect(escolherPadrao(catalogo).modelId).toBe("json");
  });

  it("resolve o empate pela ordem alfabética do modelId", () => {
    const catalogo = [
      modelo({ modelId: "zeta", maxCompletionTokens: 8192, contextWindow: 8192 }),
      modelo({ modelId: "alfa", maxCompletionTokens: 8192, contextWindow: 8192 }),
    ];
    expect(escolherPadrao(catalogo).modelId).toBe("alfa");
  });

  it("não depende da ordem em que o catálogo chega", () => {
    const catalogo = [
      modelo({ modelId: "alfa", maxCompletionTokens: 8192 }),
      modelo({ modelId: "zeta", maxCompletionTokens: 8192 }),
    ];
    const escolhido = escolherPadrao(catalogo).modelId;
    expect(escolherPadrao([...catalogo].reverse()).modelId).toBe(escolhido);
  });
});

describe("modelosAtivos", () => {
  it("devolve lista vazia para entrada inválida", () => {
    expect(modelosAtivos(undefined)).toEqual([]);
  });
});

describe("resolverModeloSelecionado", () => {
  const catalogo = [
    modelo({ modelId: "gpt-oss-120b", maxCompletionTokens: 65536 }),
    modelo({ modelId: "gpt-oss-20b", maxCompletionTokens: 8192 }),
    modelo({ modelId: "aposentado", isActive: false, maxCompletionTokens: 65536 }),
  ];

  it("respeita a preferência salva quando o modelo ainda está ativo", () => {
    expect(resolverModeloSelecionado(catalogo, "gpt-oss-20b")).toBe("gpt-oss-20b");
  });

  it("ignora a preferência salva quando o modelo foi aposentado", () => {
    expect(resolverModeloSelecionado(catalogo, "aposentado")).toBe("gpt-oss-120b");
  });

  it("usa o isDefault do banco quando não há preferência salva", () => {
    const comPadrao = [
      modelo({ modelId: "pequeno", maxCompletionTokens: 4096, isDefault: true }),
      modelo({ modelId: "grande", maxCompletionTokens: 65536 }),
    ];
    expect(resolverModeloSelecionado(comPadrao, null)).toBe("pequeno");
  });

  it("cai na política quando o banco não marca nenhum padrão", () => {
    expect(resolverModeloSelecionado(catalogo, null)).toBe("gpt-oss-120b");
  });

  it("devolve string vazia quando não sobrou nenhum modelo ativo", () => {
    const mortos = [modelo({ modelId: "a", isActive: false })];
    expect(resolverModeloSelecionado(mortos, "a")).toBe("");
  });
});

describe("cadeiaDeModelos", () => {
  const catalogo = [
    modelo({ modelId: "medio", maxCompletionTokens: 8192 }),
    modelo({ modelId: "grande", maxCompletionTokens: 65536 }),
    modelo({ modelId: "pequeno", maxCompletionTokens: 4096 }),
    modelo({ modelId: "aposentado", isActive: false, maxCompletionTokens: 65536 }),
  ];

  it("começa pelo modelo selecionado e segue pela ordem da política", () => {
    expect(cadeiaDeModelos(catalogo, "pequeno")).toEqual([
      "pequeno",
      "grande",
      "medio",
    ]);
  });

  it("não repete o selecionado dentro da cadeia", () => {
    const cadeia = cadeiaDeModelos(catalogo, "grande");
    expect(cadeia).toEqual(["grande", "medio", "pequeno"]);
    expect(new Set(cadeia).size).toBe(cadeia.length);
  });

  it("ignora o selecionado que não está mais ativo", () => {
    expect(cadeiaDeModelos(catalogo, "aposentado")).toEqual([
      "grande",
      "medio",
      "pequeno",
    ]);
  });

  it("nunca inclui modelo inativo como alternativa", () => {
    expect(cadeiaDeModelos(catalogo, "grande")).not.toContain("aposentado");
  });

  it("devolve lista vazia quando não há modelo ativo", () => {
    expect(cadeiaDeModelos([modelo({ modelId: "a", isActive: false })], "a")).toEqual([]);
  });

  it("usa a mesma ordem de ordenarPorPolitica", () => {
    const ordenados = ordenarPorPolitica(catalogo).map((m) => m.modelId);
    expect(cadeiaDeModelos(catalogo, null)).toEqual(ordenados);
  });
});

describe("normalizarModeloDaGroq", () => {
  const bruto = {
    id: "openai/gpt-oss-120b",
    name: "GPT OSS 120B",
    owned_by: "OpenAI",
    active: true,
    context_window: 131072,
    max_completion_tokens: 65536,
    input_modalities: ["text"],
    output_modalities: ["text"],
    supported_features: ["tools", "json_mode", "structured_outputs"],
    pricing: { prompt: "0.00000015" },
  };

  it("mapeia os campos que o catálogo usa", () => {
    expect(normalizarModeloDaGroq(bruto)).toEqual({
      modelId: "openai/gpt-oss-120b",
      name: "GPT OSS 120B",
      contextWindow: 131072,
      maxCompletionTokens: 65536,
      ownedBy: "OpenAI",
      inputModalities: ["text"],
      outputModalities: ["text"],
      features: ["tools", "json_mode", "structured_outputs"],
      activeNaGroq: true,
    });
  });

  it("não carrega o resto da resposta para o banco", () => {
    expect(normalizarModeloDaGroq(bruto).pricing).toBeUndefined();
  });

  it("cai no id quando o modelo não tem nome", () => {
    expect(normalizarModeloDaGroq({ id: "sem-nome" }).name).toBe("sem-nome");
  });
});

describe("isModeloApto", () => {
  const apto = {
    modelId: "openai/gpt-oss-120b",
    contextWindow: 131072,
    maxCompletionTokens: 65536,
    inputModalities: ["text"],
    outputModalities: ["text"],
    features: ["json_mode", "structured_outputs"],
  };

  it("aprova um modelo de texto com json_mode e capacidade suficiente", () => {
    expect(isModeloApto(apto).apto).toBe(true);
  });

  it("recusa modelo de entrada em áudio", () => {
    const whisper = { ...apto, modelId: "whisper-large-v3", inputModalities: ["audio"] };
    expect(isModeloApto(whisper)).toMatchObject({ apto: false });
    expect(isModeloApto(whisper).motivo).toContain("entrada");
  });

  it("recusa modelo de saída em fala", () => {
    const orpheus = { ...apto, modelId: "orpheus", outputModalities: ["speech"] };
    expect(isModeloApto(orpheus).motivo).toContain("saída");
  });

  it("recusa modelo sem json_mode", () => {
    expect(isModeloApto({ ...apto, features: ["tools"] }).motivo).toContain("json_mode");
  });

  it("recusa contexto pequeno demais", () => {
    const guard = { ...apto, modelId: "prompt-guard", contextWindow: 512, maxCompletionTokens: 512 };
    expect(isModeloApto(guard).motivo).toContain("contexto");
  });

  it("recusa saída pequena demais", () => {
    expect(isModeloApto({ ...apto, maxCompletionTokens: 512 }).motivo).toContain("saída");
  });

  it("NÃO barra o safeguard só por ter 'guard' no nome", () => {
    // A regex antiga (/whisper|tts|guard|playai/i) excluía este modelo por
    // acidente, mesmo ele sendo tão capaz quanto o gpt-oss-20b.
    const safeguard = { ...apto, modelId: "openai/gpt-oss-safeguard-20b" };
    expect(isModeloApto(safeguard).apto).toBe(true);
  });

  it("barra quem casa com um denyPattern declarado", () => {
    const resultado = isModeloApto(apto, ["^openai/"]);
    expect(resultado.apto).toBe(false);
    expect(resultado.motivo).toContain("denyPattern");
  });

  it("ignora denyPattern inválido em vez de derrubar a análise", () => {
    expect(isModeloApto(apto, ["(((("]).apto).toBe(true);
  });

  it("recusa registro sem modelId", () => {
    expect(isModeloApto({}).motivo).toBe("sem modelId");
  });
});
