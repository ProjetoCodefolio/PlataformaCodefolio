import { describe, it, expect } from "vitest";
import {
  calcularOrcamento,
  envelopeDaRequisicao,
  cortarNoLimite,
  deveUsarModoJson,
  TOKENS_POR_QUESTAO,
} from "./tokenBudget";

// Valores reais medidos na conta em 18/09/2026.
const GPT_OSS_120B = {
  modelId: "openai/gpt-oss-120b",
  contextWindow: 131072,
  maxCompletionTokens: 65536,
  tpmLimit: 8000,
  features: ["tools", "json_mode", "structured_outputs"],
};

const COMPOUND = {
  modelId: "groq/compound",
  contextWindow: 131072,
  maxCompletionTokens: 8192,
  tpmLimit: 70000,
  features: ["json_mode"],
};

describe("envelopeDaRequisicao", () => {
  it("usa o limite de tokens por minuto quando ele é menor que o contexto", () => {
    // 131072 de contexto não valem nada com 8000 de TPM.
    expect(envelopeDaRequisicao(GPT_OSS_120B)).toBe(6800);
  });

  it("usa o contexto quando ele é menor que o TPM", () => {
    expect(envelopeDaRequisicao({ contextWindow: 4096, tpmLimit: 70000 })).toBe(4096);
  });

  it("é conservador enquanto o TPM não foi sincronizado", () => {
    expect(envelopeDaRequisicao({ contextWindow: 131072 })).toBe(6000);
  });

  it("aceita o campo legado maxContext", () => {
    expect(envelopeDaRequisicao({ maxContext: 4096 })).toBe(4096);
  });

  it("não explode com registro vazio", () => {
    expect(envelopeDaRequisicao({})).toBe(6000);
    expect(envelopeDaRequisicao()).toBe(6000);
  });
});

describe("calcularOrcamento - a saída acompanha o que foi pedido", () => {
  it("reserva mais saída para 30 questões do que para 5", () => {
    const poucas = calcularOrcamento(GPT_OSS_120B, 5);
    const muitas = calcularOrcamento(GPT_OSS_120B, 30);

    expect(muitas.maxOutputTokens).toBeGreaterThan(poucas.maxOutputTokens);
  });

  it("cabe o custo real das questões pedidas", () => {
    const { maxOutputTokens } = calcularOrcamento(GPT_OSS_120B, 30);
    expect(maxOutputTokens).toBeGreaterThanOrEqual(30 * TOKENS_POR_QUESTAO);
  });

  it("supera com folga o piso de 1024 que limitava a ~10 questões", () => {
    // Era esse piso que fazia um pedido de 30 questões voltar com 10.
    expect(calcularOrcamento(GPT_OSS_120B, 30).maxOutputTokens).toBeGreaterThan(1024);
  });

  it("respeita o teto de saída do modelo", () => {
    // O compound escreve no máximo 8192, por mais questões que se peça.
    const { maxOutputTokens } = calcularOrcamento(COMPOUND, 500);
    expect(maxOutputTokens).toBeLessThanOrEqual(8192);
  });

  it("nunca deixa a saída comer o envelope inteiro", () => {
    const { maxOutputTokens, maxPromptTokens } = calcularOrcamento(GPT_OSS_120B, 500);
    expect(maxPromptTokens).toBeGreaterThan(0);
    expect(maxOutputTokens).toBeLessThan(envelopeDaRequisicao(GPT_OSS_120B));
  });

  it("garante uma saída mínima mesmo pedindo uma questão só", () => {
    expect(calcularOrcamento(GPT_OSS_120B, 1).maxOutputTokens).toBeGreaterThanOrEqual(512);
  });
});

describe("calcularOrcamento - o PDF fica com o que sobra", () => {
  it("dá muito mais espaço de texto ao modelo com TPM alto", () => {
    const apertado = calcularOrcamento(GPT_OSS_120B, 10);
    const folgado = calcularOrcamento(COMPOUND, 10);

    expect(folgado.maxPdfChars).toBeGreaterThan(apertado.maxPdfChars * 5);
  });

  it("prompt e saída somados não estouram o envelope", () => {
    for (const modelo of [GPT_OSS_120B, COMPOUND]) {
      for (const n of [1, 5, 30, 50]) {
        const o = calcularOrcamento(modelo, n);
        expect(o.maxOutputTokens + o.maxPromptTokens).toBeLessThanOrEqual(o.envelope);
      }
    }
  });

  it("converte tokens de prompt em caracteres", () => {
    const o = calcularOrcamento(COMPOUND, 10);
    expect(o.maxPdfChars).toBe(o.maxPromptTokens * 4);
  });
});

describe("cortarNoLimite", () => {
  it("devolve o texto intacto quando cabe", () => {
    expect(cortarNoLimite("curto", 100)).toEqual({ texto: "curto", truncado: false });
  });

  it("corta e avisa no próprio texto quando não cabe", () => {
    const { texto, truncado } = cortarNoLimite("a".repeat(500), 100);
    expect(truncado).toBe(true);
    expect(texto).toContain("[Texto truncado");
  });

  it("prefere terminar num fim de parágrafo", () => {
    const entrada = "a".repeat(90) + "\n\n" + "b".repeat(100);
    const { texto } = cortarNoLimite(entrada, 100);
    expect(texto.startsWith("a".repeat(90))).toBe(true);
    expect(texto).not.toContain("b");
  });

  it("não quebra com entrada vazia ou nula", () => {
    expect(cortarNoLimite("", 10).texto).toBe("");
    expect(cortarNoLimite(null, 10)).toEqual({ texto: "", truncado: false });
  });
});

describe("deveUsarModoJson", () => {
  it("liga quando o modelo suporta json_mode", () => {
    expect(deveUsarModoJson(GPT_OSS_120B, 4000)).toBe(true);
  });

  it("aceita features como objeto", () => {
    expect(deveUsarModoJson({ features: { json_mode: true } }, 4000)).toBe(true);
  });

  it("não liga para modelo sem json_mode", () => {
    expect(deveUsarModoJson({ features: ["tools"] }, 4000)).toBe(false);
  });

  it("não liga com orçamento de saída apertado", () => {
    // Modo JSON com pouco espaço devolve 400 json_validate_failed em vez de
    // JSON cortado, o que é pior do que não usar modo JSON.
    expect(deveUsarModoJson(GPT_OSS_120B, 100)).toBe(false);
  });

  it("não liga para catálogo sem features sincronizadas", () => {
    expect(deveUsarModoJson({ modelId: "antigo" }, 4000)).toBe(false);
  });
});
