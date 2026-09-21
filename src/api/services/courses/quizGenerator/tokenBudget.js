/**
 * Orçamento de tokens de uma geração de questões.
 *
 * Antes desta conta existir, as duas pontas decidiam sozinhas e brigavam: o
 * `pdfExtraction` cortava o PDF em "metade do contexto" de um catálogo
 * desatualizado no código, e o `groqClient` reservava a saída a partir de um
 * teto fixo de 5500 tokens. Resultado prático: PDF cortado em 16.384
 * caracteres para qualquer modelo e `max_tokens` no piso de 1024, que é onde
 * cabem só umas 10 questões, independentemente de quantas foram pedidas.
 *
 * Três limites mandam aqui, e o menor sempre vence:
 *   - `contextWindow`: quanto o modelo lê de uma vez (prompt + saída);
 *   - `maxCompletionTokens`: quanto o modelo escreve de uma vez;
 *   - o limite de tokens por minuto (TPM) da conta NAQUELE modelo, que é o que
 *     de fato aperta hoje. Medido em 18/09/2026: 8.000 no `openai/gpt-oss-120b`
 *     contra 70.000 no `groq/compound`, com o mesmo contexto de 131.072. Ou
 *     seja, o TPM é por modelo e pode ser 16x menor que a janela de contexto.
 *     Ignorá-lo troca o 404 de modelo morto por um 413 de requisição grande.
 */

/**
 * Custo observado de uma questão de múltipla escolha gerada, em tokens de
 * saída. Medido em 102 nas 30 questões reais do quiz "Aulão de Reposição";
 * arredondado para cima para não cortar a última questão ao meio.
 */
export const TOKENS_POR_QUESTAO = 110;

/** Sobra sobre o custo estimado, para variação de tamanho entre questões. */
const FOLGA_DE_SAIDA = 1.25;

/**
 * Saída mínima. Não é folga: com menos que isto um modelo de raciocínio gasta
 * o orçamento inteiro pensando e devolve conteúdo vazio, que chega na tela
 * como "Resposta inesperada da API GROQ".
 */
export const SAIDA_MINIMA = 1024;

/**
 * Reserva para os tokens de raciocínio dos modelos que têm a feature
 * `reasoning` (hoje, os quatro melhores do catálogo). Eles contam no mesmo
 * `max_tokens` da resposta: medido em 18/09/2026, ~210 tokens de raciocínio
 * num pedido de 5 questões, e cresce com a dificuldade da tarefa. Sem esta
 * reserva, o pedido de 5 questões saía com `max_tokens` 688 e voltava
 * `finish_reason: "length"` com o JSON cortado no meio.
 */
const RESERVA_DE_RACIOCINIO = 700;

/**
 * Quanto do TPM a gente se permite usar numa requisição. O contador da Groq
 * soma prompt e saída da janela inteira do minuto, e a nossa estimativa de
 * tokens é aproximada (~4 caracteres por token), então pedir o limite cheio é
 * pedir 413.
 */
const FATIA_DO_TPM = 0.85;

/**
 * Teto de tokens de UMA requisição, independente do que o cabeçalho de TPM
 * anuncia. Medido em 18/09/2026 no `groq/compound-mini`, que reporta 70.000 de
 * TPM e 131.072 de contexto: 8.000 tokens passam, 16.000 devolvem 413
 * `request_too_large`, e isso com 36.590 tokens ainda livres na janela do
 * minuto. Ou seja, "cabe no contexto" e "cabe no minuto" não garantem que
 * cabe numa requisição só.
 */
const TETO_POR_REQUISICAO = 8000;

/** Tokens gastos pelas instruções fixas de formato, papel de sistema e afins. */
const OVERHEAD_DE_INSTRUCOES = 400;

/** Aproximação usual para português: 1 token ~ 4 caracteres. */
export const CARACTERES_POR_TOKEN = 4;

const temFeature = (modelo, nome) => {
  const features = modelo?.features;
  if (Array.isArray(features)) return features.includes(nome);
  return Boolean(features && features[nome]);
};

/**
 * Modelos de raciocínio gastam tokens "pensando" antes de escrever, e esse
 * gasto sai do mesmo `max_tokens` da resposta.
 * @param {object} modelo - Registro do catálogo
 * @returns {boolean}
 */
export const modeloRaciocina = (modelo) => temFeature(modelo, "reasoning");

/**
 * Teto de tokens que uma requisição a este modelo pode ocupar, somando prompt
 * e saída. Sem `tpmLimit` sincronizado, assume um valor conservador: errar
 * para baixo custa um PDF menor, errar para cima custa a geração inteira.
 * @param {object} modelo - Registro do catálogo `llmModels`
 * @returns {number}
 */
export const envelopeDaRequisicao = (modelo = {}) => {
  const contexto = Number(modelo.contextWindow) || Number(modelo.maxContext) || 8192;
  const tpm = Number(modelo.tpmLimit) || 0;
  const porRequisicao = Math.floor(TETO_POR_REQUISICAO * FATIA_DO_TPM);

  if (!tpm) return Math.min(contexto, 6000, porRequisicao);
  return Math.min(contexto, Math.floor(tpm * FATIA_DO_TPM), porRequisicao);
};

/**
 * Calcula quanto cabe de saída e de texto do PDF nesta geração.
 *
 * A saída é dimensionada pelo que foi PEDIDO (30 questões pedem ~30 questões
 * de espaço), limitada pelo que o modelo escreve e pelo envelope. O texto do
 * PDF fica com o que sobrar: é ele que cede espaço, porque um PDF cortado
 * ainda gera questões e uma saída cortada devolve JSON quebrado.
 *
 * @param {object} modelo - Registro do catálogo `llmModels`
 * @param {number} numQuestions - Quantidade de questões pedida
 * @param {number} [tokensJaNoPrompt] - Instruções/prompt fora o texto do PDF
 * @returns {{maxOutputTokens: number, maxPromptTokens: number, maxPdfChars: number, envelope: number}}
 */
export const calcularOrcamento = (
  modelo = {},
  numQuestions = 1,
  tokensJaNoPrompt = OVERHEAD_DE_INSTRUCOES
) => {
  const envelope = envelopeDaRequisicao(modelo);
  const tetoDoModelo =
    Number(modelo.maxCompletionTokens) || Number(modelo.maxOutputTokens) || envelope;

  const desejado =
    Math.ceil(numQuestions * TOKENS_POR_QUESTAO * FOLGA_DE_SAIDA) +
    (modeloRaciocina(modelo) ? RESERVA_DE_RACIOCINIO : 0);

  // A saída nunca pode comer o envelope inteiro: sem espaço de prompt não há
  // texto para gerar questão a partir de quê.
  const tetoNoEnvelope = Math.floor(envelope * 0.65);

  const maxOutputTokens = Math.max(
    SAIDA_MINIMA,
    Math.min(desejado, tetoDoModelo, tetoNoEnvelope)
  );

  const maxPromptTokens = Math.max(0, envelope - maxOutputTokens - tokensJaNoPrompt);

  return {
    envelope,
    maxOutputTokens,
    maxPromptTokens,
    maxPdfChars: maxPromptTokens * CARACTERES_POR_TOKEN,
  };
};

/**
 * Corta o texto no limite de caracteres, preferindo terminar num fim de
 * parágrafo para não entregar frase pela metade ao modelo.
 * @param {string} texto
 * @param {number} maxChars
 * @returns {{texto: string, truncado: boolean}}
 */
export const cortarNoLimite = (texto, maxChars) => {
  if (typeof texto !== "string" || texto.length <= maxChars) {
    return { texto: texto || "", truncado: false };
  }

  let cortado = texto.substring(0, maxChars);
  const ultimoParagrafo = cortado.lastIndexOf("\n\n");
  if (ultimoParagrafo > maxChars * 0.8) {
    cortado = cortado.substring(0, ultimoParagrafo);
  }

  return {
    texto:
      cortado +
      "\n\n[Texto truncado devido ao tamanho. Partes finais do documento não foram incluídas.]",
    truncado: true,
  };
};

/**
 * Indica se vale mandar `response_format: {type: "json_object"}` para este
 * modelo. Duas armadilhas conhecidas da Groq, as duas medidas em 18/09/2026:
 * as mensagens precisam conter a palavra "json" (as instruções de formato já
 * contêm), e com orçamento de saída apertado a resposta vira 400
 * `json_validate_failed` em vez de JSON cortado.
 * @param {object} modelo - Registro do catálogo
 * @param {number} maxOutputTokens - Saída já calculada
 * @returns {boolean}
 */
export const deveUsarModoJson = (modelo = {}, maxOutputTokens = 0) =>
  temFeature(modelo, "json_mode") && maxOutputTokens >= SAIDA_MINIMA;
