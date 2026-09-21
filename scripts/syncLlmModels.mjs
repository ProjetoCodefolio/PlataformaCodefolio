#!/usr/bin/env node
// Sincroniza o catálogo `llmModels` com a lista real de modelos da Groq.
//
// O catálogo era mantido por digitação humana e envelhecia em silêncio: em
// 18/09/2026, 4 dos 8 modelos que o seletor oferecia já não existiam, entre
// eles o que era o padrão do gerador, e o contexto cadastrado estava errado
// para menos em TODOS os vivos. O app só descobria isso na cara do professor.
//
// Metadado não basta: um modelo pode constar na lista e mesmo assim recusar a
// nossa chamada (cota, tier, política da conta). Por isso cada candidato leva
// um CANÁRIO, uma chamada mínima de chat completion. Só entra ativo quem
// responder.
//
// Nunca apaga: um modelo que sumiu é aposentado (`isActive: false` com
// `retiredAt` e `retiredReason`), porque o registro é a explicação de por que
// ele sumiu do seletor.
//
// Uso:
//   node scripts/syncLlmModels.mjs                    # dry-run (padrão)
//   node scripts/syncLlmModels.mjs --apply            # grava no banco
//   node scripts/syncLlmModels.mjs --apply --force    # libera o portão de aposentadoria em massa
//   node scripts/syncLlmModels.mjs --sem-canario      # pula o canário (só metadado)
//   node scripts/syncLlmModels.mjs --min-modelos 5    # piso de sanidade da lista
//
// Credenciais:
//   GROQ_API_KEY (ou VITE_GROQ_API_KEY, que o .env já traz) é obrigatória.
//   O dry-run lê o catálogo pelo REST público e NÃO precisa de credencial do
//   Firebase. O --apply exige GOOGLE_APPLICATION_CREDENTIALS (conta de serviço).

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import {
  normalizarModeloDaGroq,
  isModeloApto,
  escolherPadrao,
} from "../src/api/services/courses/llmModelPolicy.js";

const args = process.argv.slice(2);
const temFlag = (nome) => args.includes(nome);
const valorFlag = (nome, padrao) => {
  const i = args.indexOf(nome);
  return i >= 0 && args[i + 1] ? args[i + 1] : padrao;
};

const APLICAR = temFlag("--apply");
const FORCAR = temFlag("--force");
const SEM_CANARIO = temFlag("--sem-canario");
const MIN_MODELOS = Number(valorFlag("--min-modelos", 5));

const PROJECT_ID = process.env.GCLOUD_PROJECT || "plataformacodefolio";
const RTDB = process.env.RTDB_URL || `https://${PROJECT_ID}-default-rtdb.firebaseio.com`;
const GROQ_BASE = "https://api.groq.com/openai/v1";
const PAUSA_ENTRE_CANARIOS_MS = 1000;

const agora = () => new Date().toISOString();
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

/** Lê GROQ_API_KEY do ambiente, aceitando o nome que o .env do app usa. */
const lerChaveGroq = () => {
  const doAmbiente = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;
  if (doAmbiente) return doAmbiente;

  // Conveniência para rodar na máquina do dev sem exportar nada.
  try {
    const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
    const linha = env.split("\n").find((l) => l.startsWith("VITE_GROQ_API_KEY="));
    if (linha) return linha.slice("VITE_GROQ_API_KEY=".length).trim();
  } catch {
    // sem .env: segue para o erro abaixo
  }
  return null;
};

const abortar = (mensagem) => {
  console.error(`\nABORTADO: ${mensagem}`);
  process.exit(1);
};

// ---------------------------------------------------------------- Groq

/**
 * Traduz o status HTTP da Groq no que quem lê o resumo do job precisa decidir:
 * alguém tem de gerar uma chave nova, ou é só esperar a próxima execução.
 * Sem isso, "devolveu 401" e "devolveu 503" pareciam a mesma notícia, e a
 * suspeita caía sempre na Groq, que é a hipótese errada nos dois casos mais
 * comuns (chave revogada e cota estourada).
 */
export const diagnosticarStatusDaGroq = (status) => {
  if (status === 401 || status === 403) {
    return {
      causa: "chave inválida, revogada ou sem permissão para este recurso",
      acao:
        "gere outra em https://console.groq.com/keys e atualize o .env local e o " +
        "secret VITE_GROQ_API_KEY do repositório",
      transitorio: false,
    };
  }
  if (status === 429) {
    return {
      causa: "cota ou limite de requisições estourado",
      acao: "transitório: espere a janela virar; o agendamento de amanhã deve passar",
      transitorio: true,
    };
  }
  if (status >= 500) {
    return {
      causa: "falha do lado da Groq",
      acao: "transitório: reexecute o job pelo workflow_dispatch ou espere o agendamento",
      transitorio: true,
    };
  }
  // O canário usa 0 para "a requisição não chegou a ter resposta" (DNS, TLS,
  // timeout). Não é veredito sobre o modelo, é ruído de rede.
  if (!status) {
    return {
      causa: "a requisição não chegou a ter resposta (rede)",
      acao: "transitório: reexecute o job",
      transitorio: true,
    };
  }
  return {
    causa: "resposta inesperada",
    acao: "confira o corpo do erro acima e a documentação da Groq",
    transitorio: false,
  };
};

/**
 * A mensagem de erro da Groq é mais específica que o status ("Invalid API Key"
 * distingue chave errada de chave certa em projeto errado). Não vaza segredo:
 * a Groq não devolve a chave enviada.
 */
const lerErroDaGroq = async (resposta) => {
  const corpo = await resposta.text().catch(() => "");
  if (!corpo) return "";
  try {
    return JSON.parse(corpo)?.error?.message || corpo.slice(0, 200);
  } catch {
    return corpo.slice(0, 200);
  }
};

const listarModelosDaGroq = async (chave) => {
  const resposta = await fetch(`${GROQ_BASE}/models`, {
    headers: { Authorization: `Bearer ${chave}` },
  });
  if (!resposta.ok) {
    const detalhe = await lerErroDaGroq(resposta);
    const { causa, acao } = diagnosticarStatusDaGroq(resposta.status);
    abortar(
      `GET /models devolveu ${resposta.status}: ${causa}. Nada foi escrito.` +
        (detalhe ? `\n  resposta da Groq: ${detalhe}` : "") +
        `\n  o que fazer: ${acao}`
    );
  }
  const corpo = await resposta.json();
  return Array.isArray(corpo?.data) ? corpo.data : [];
};

/**
 * Canário: chamada mínima de chat completion. Confirma que a conta consegue
 * MESMO usar o modelo, o que a lista de metadados não garante.
 *
 * Duas armadilhas do modo JSON da Groq, as duas descobertas aqui e as duas
 * valendo para a geração real:
 *   - as mensagens PRECISAM conter a palavra "json", senão a resposta é 400
 *     `'messages' must contain the word 'json' in some form`;
 *   - com `max_tokens` apertado a resposta é 400 `json_validate_failed` em vez
 *     de JSON cortado, por isso os 128 tokens de folga.
 */
const canario = async (chave, modelId) => {
  const inicio = Date.now();
  try {
    const resposta = await fetch(`${GROQ_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${chave}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          {
            role: "system",
            content: 'Responda somente com o json {"ok":true}, sem mais nada.',
          },
          { role: "user", content: 'Devolva o json {"ok":true}' },
        ],
        temperature: 0,
        max_tokens: 128,
        response_format: { type: "json_object" },
      }),
    });

    const latencyMs = Date.now() - inicio;

    // O limite de tokens por minuto é POR MODELO e não aparece na lista de
    // modelos, só no cabeçalho da resposta de uma chamada real. Medido em
    // 18/09/2026: 8.000 no openai/gpt-oss-120b contra 70.000 no groq/compound,
    // com o mesmo contexto de 131.072. É ele, e não a janela de contexto, que
    // limita o tamanho do PDF que cabe numa geração, então o canário aproveita
    // a chamada que já faz para trazê-lo.
    const tpmLimit = Number(resposta.headers.get("x-ratelimit-limit-tokens")) || null;

    if (!resposta.ok) {
      const corpo = await resposta.text().catch(() => "");
      let errorCode = String(resposta.status);
      try {
        errorCode = JSON.parse(corpo)?.error?.code || errorCode;
      } catch {
        // corpo não-JSON: fica o status
      }
      return { ok: false, at: agora(), status: resposta.status, errorCode, latencyMs, tpmLimit };
    }

    const corpo = await resposta.json();
    const conteudo = corpo?.choices?.[0]?.message?.content;
    try {
      JSON.parse(conteudo);
    } catch {
      return {
        ok: false,
        at: agora(),
        status: 200,
        errorCode: "resposta_nao_json",
        latencyMs,
        tpmLimit,
      };
    }
    return { ok: true, at: agora(), status: 200, errorCode: null, latencyMs, tpmLimit };
  } catch (erro) {
    return {
      ok: false,
      at: agora(),
      status: 0,
      errorCode: erro?.name || "erro_de_rede",
      latencyMs: Date.now() - inicio,
      tpmLimit: null,
    };
  }
};

const TENTATIVAS_DO_CANARIO = 3;
const PAUSA_ENTRE_TENTATIVAS_MS = 2000;

// Erros que são azar da chamada, não perda de capacidade do modelo.
// `json_validate_failed` é o caso que motivou isto: no JSON mode da Groq, é o
// próprio modelo que erra a sintaxe, e isso varia de chamada para chamada.
const CODIGOS_INSTAVEIS = new Set(["json_validate_failed"]);

const valeRetentar = (resultado) =>
  CODIGOS_INSTAVEIS.has(resultado.errorCode) ||
  diagnosticarStatusDaGroq(resultado.status).transitorio;

/**
 * Aposenta só quem falha de forma consistente.
 *
 * Em 21/09/2026 o openai/gpt-oss-20b passou no canário em dois dry-runs e
 * falhou com `json_validate_failed` no --apply minutos depois: uma chamada
 * azarada tirou do seletor do professor um modelo que funcionava. Já uma
 * recusa de verdade (modelo desligado, sem permissão na conta) repete em
 * todas as tentativas, então a retentativa não esconde nada.
 *
 * Erro de credencial NÃO é retentado: a chave não melhora em 2 segundos, e o
 * portão de "nenhum canário passou" é quem deve falar nesse caso.
 */
export const canarioComRetentativa = async (chave, modelId, pausaMs = PAUSA_ENTRE_TENTATIVAS_MS) => {
  let resultado;
  for (let tentativa = 1; tentativa <= TENTATIVAS_DO_CANARIO; tentativa += 1) {
    resultado = { ...(await canario(chave, modelId)), tentativas: tentativa };
    if (resultado.ok || !valeRetentar(resultado)) return resultado;
    if (tentativa < TENTATIVAS_DO_CANARIO) {
      console.log(
        `  instavel ${modelId}  (${resultado.errorCode} na tentativa ${tentativa}` +
          ` de ${TENTATIVAS_DO_CANARIO}, retentando)`
      );
      await dormir(pausaMs);
    }
  }
  return resultado;
};

// ---------------------------------------------------------------- banco

/** Dry-run lê pelo REST público; --apply usa o Admin SDK. */
const lerCatalogo = async () => {
  if (APLICAR) {
    const { initAdminDb } = await import("./lib/firebaseAdmin.mjs");
    const { db, mode } = initAdminDb();
    console.log(`Banco: ${mode}`);
    const snap = await db.ref("llmModels").get();
    const politica = await db.ref("llmModelPolicy/denyPatterns").get();
    return {
      db,
      registros: snap.val() || {},
      denyPatterns: Object.values(politica.val() || {}),
    };
  }

  console.log(`Banco: ${RTDB} (leitura pública, dry-run)`);

  // A URL pode trazer query string, e o emulador EXIGE `?ns=<namespace>`.
  // Colar ".json" no fim sem preservar a query faz o emulador responder null,
  // e aí o diff acha que o catálogo está vazio e marca todo modelo como novo.
  const [base, query] = RTDB.split("?");
  const urlDe = (caminho) =>
    `${base.replace(/\/$/, "")}/${caminho}.json${query ? `?${query}` : ""}`;

  const ler = async (caminho) => {
    const r = await fetch(urlDe(caminho));
    if (!r.ok) abortar(`GET ${caminho} devolveu ${r.status}`);
    return r.json();
  };

  // `llmModelPolicy` não é de leitura pública e é opcional: sem ele o dry-run
  // roda sem exclusões declaradas, e avisa que a lista pode diferir do que o
  // --apply vai enxergar. Abortar aqui esconderia o diff por causa de um nó
  // que na maioria das vezes nem existe.
  let denyPatterns = [];
  const resposta = await fetch(urlDe("llmModelPolicy/denyPatterns"));
  if (resposta.ok) {
    denyPatterns = Object.values((await resposta.json()) || {});
  } else {
    console.warn(
      `  aviso: denyPatterns não legível sem credencial (HTTP ${resposta.status}). ` +
        "O dry-run segue sem exclusões declaradas."
    );
  }

  return { db: null, registros: (await ler("llmModels")) || {}, denyPatterns };
};

// ---------------------------------------------------------------- diff

/**
 * Compara catálogo atual e resultado do sync, casando pelo `modelId`.
 * Função pura: é o miolo testável do script.
 *
 * @param {object} registros - nó `llmModels` como está no banco
 * @param {object[]} aptos - modelos normalizados aprovados no metadado
 * @param {Map<string,object>} canarios - resultado do canário por modelId
 * @param {Map<string,string>} [motivosDeExclusao] - por que cada modelo da API
 *   não passou no metadado; sem isso, um modelo que a Groq ainda oferece seria
 *   aposentado com a justificativa errada de "ausente na API"
 */
export const calcularDiff = (registros, aptos, canarios, motivosDeExclusao = new Map()) => {
  const porModelId = new Map(
    Object.entries(registros).map(([chave, valor]) => [valor?.modelId, { chave, ...valor }])
  );
  const aprovados = aptos.filter((m) => canarios.get(m.modelId)?.ok !== false);
  const vencedor = escolherPadrao(aprovados.map((m) => ({ ...m, isActive: true })));

  const novos = [];
  const atualizados = [];
  const aposentados = [];

  for (const modelo of aprovados) {
    const existente = porModelId.get(modelo.modelId);
    const campos = {
      ...modelo,
      // Espelho do campo legado enquanto o app antigo estiver no ar.
      maxContext: modelo.contextWindow,
      isActive: true,
      isDefault: modelo.modelId === vencedor?.modelId,
      canary: canarios.get(modelo.modelId) || null,
      syncedAt: agora(),
    };

    // Fora do canário para o orçamento de tokens não precisar cavar dentro
    // dele; sem medição, o campo não é escrito e o app usa o piso conservador.
    const tpm = canarios.get(modelo.modelId)?.tpmLimit;
    if (tpm) campos.tpmLimit = tpm;

    // Nome renomeado pelo admin não é sobrescrito.
    if (existente?.name && existente.name !== modelo.name) campos.name = existente.name;
    // `overrideIsActive` é decisão humana declarada: o sync não encosta.
    if (typeof existente?.overrideIsActive === "boolean") delete campos.isActive;

    // Carimbo de aposentadoria não sobrevive à reativação. Sem isto, um modelo
    // vivo no seletor carrega o `retiredReason` que explica por que ele saiu
    // dele, e o registro contradiz a si mesmo do mesmo jeito que um aposentado
    // carregando um canário ok. `null` apaga o caminho no RTDB.
    //
    // Condicionado a `campos.isActive`: quando um humano declarou
    // `overrideIsActive`, o sync não mexe no estado nem na explicação dele. E
    // condicionado ao registro ter carimbo, para não escrever dois caminhos
    // por modelo em toda execução só para apagar nada.
    if (campos.isActive && (existente?.retiredAt || existente?.retiredReason)) {
      campos.retiredAt = null;
      campos.retiredReason = null;
    }

    if (!existente) novos.push({ modelo, campos });
    else atualizados.push({ chave: existente.chave, modelo, campos, antes: existente });
  }

  const idsAprovados = new Set(aprovados.map((m) => m.modelId));
  for (const [modelId, existente] of porModelId) {
    if (idsAprovados.has(modelId) || existente.isActive === false) continue;
    if (typeof existente.overrideIsActive === "boolean") continue;

    const canarioFalho = canarios.get(modelId);
    const motivoDeMetadado = motivosDeExclusao.get(modelId);

    let motivo;
    if (canarioFalho) {
      const vezes = canarioFalho.tentativas > 1 ? ` ${canarioFalho.tentativas} vezes` : "";
      motivo = `canário falhou${vezes}: ${canarioFalho.errorCode}`;
    } else if (motivoDeMetadado) {
      motivo = `não serve para gerar questões: ${motivoDeMetadado}`;
    } else {
      motivo = "ausente na API da Groq";
    }

    // O canário que falhou vai junto: sem ele, o registro dizia
    // `retiredReason: "canário falhou"` ao lado de um `canary: {ok: true}` de
    // dias antes, e quem abrisse para entender por que o modelo saiu do
    // seletor encontrava o registro se contradizendo. Quem é aposentado por
    // outro motivo mantém o último canário, que continua sendo a última
    // observação verdadeira.
    aposentados.push({ chave: existente.chave, modelId, motivo, canario: canarioFalho || null });
  }

  return { novos, atualizados, aposentados, vencedor };
};

// ---------------------------------------------------------------- execução

// Só roda quando chamado pela linha de comando. Importado (pelos testes
// do diff), o módulo expõe as funções puras e não dispara nada.
const main = async () => {

  const chave = lerChaveGroq();
  if (!chave) abortar("GROQ_API_KEY (ou VITE_GROQ_API_KEY) não encontrada.");

  console.log(`Modo: ${APLICAR ? "APLICAR (grava no banco)" : "dry-run (não grava nada)"}`);

  const brutos = await listarModelosDaGroq(chave);
  console.log(`Groq devolveu ${brutos.length} modelos.`);

  // Portão 1: lista curta demais é sinal de resposta degradada.
  if (brutos.length < MIN_MODELOS) {
    abortar(`a Groq devolveu ${brutos.length} modelos, abaixo do piso de ${MIN_MODELOS}.`);
  }

  const { db, registros, denyPatterns } = await lerCatalogo();
  console.log(
    `Catálogo atual: ${Object.keys(registros).length} registros` +
      (denyPatterns.length ? `, denyPatterns: ${denyPatterns.join(", ")}` : "")
  );

  // Catálogo vazio quase nunca é um banco vazio de verdade: é URL errada. Sem
  // este aviso, o diff marcaria todos os modelos como novos e ninguém como
  // aposentado, o que parece um resultado legítimo.
  if (Object.keys(registros).length === 0) {
    console.warn(
      "  aviso: o catálogo veio VAZIO. Confira a URL do banco. Para o emulador,\n" +
        "  use RTDB_URL='http://localhost:9000?ns=<projeto>-default-rtdb' no dry-run\n" +
        "  ou FIREBASE_DATABASE_EMULATOR_HOST=127.0.0.1:9000 com --apply."
    );
  }

  const normalizados = brutos.map(normalizarModeloDaGroq);
  const aptos = [];
  const motivosDeExclusao = new Map();
  console.log("\n--- aptidão por metadado ---");
  for (const modelo of normalizados) {
    const { apto, motivo } = isModeloApto(modelo, denyPatterns);
    if (apto) aptos.push(modelo);
    else motivosDeExclusao.set(modelo.modelId, motivo);
    console.log(`  ${apto ? "apto   " : "fora   "} ${modelo.modelId}${apto ? "" : `  (${motivo})`}`);
  }

  const canarios = new Map();
  if (SEM_CANARIO) {
    console.log("\n--- canário pulado (--sem-canario) ---");
  } else {
    console.log("\n--- canário ---");
    for (const modelo of aptos) {
      const resultado = await canarioComRetentativa(chave, modelo.modelId);
      canarios.set(modelo.modelId, resultado);
      console.log(
        `  ${resultado.ok ? "ok     " : "FALHOU "} ${modelo.modelId}  ${resultado.latencyMs}ms` +
          (resultado.ok ? "" : `  (${resultado.errorCode})`) +
          (resultado.tentativas > 1 ? `  [${resultado.tentativas} tentativas]` : "")
      );
      await dormir(PAUSA_ENTRE_CANARIOS_MS);
    }

    // Portão 2: nenhum canário passando é sintoma de chave revogada, não de
    // catálogo morto. Sem este portão, um problema de credencial aposentaria
    // o catálogo inteiro.
    if (aptos.length > 0 && [...canarios.values()].every((c) => !c.ok)) {
      // O canário já guarda o status de cada falha; ele responde a pergunta
      // que interessa aqui (chave ou Groq?) melhor que um palpite.
      const statuses = [...new Set([...canarios.values()].map((c) => c.status))];
      const vistos = statuses.map((s) => (s === 0 ? "erro de rede" : s)).join(", ");
      const { causa, acao } = diagnosticarStatusDaGroq(statuses[0]);
      const mesmaCausa = statuses.length === 1;
      abortar(
        `nenhum candidato passou no canário (status ${vistos}).` +
          (mesmaCausa ? `\n  causa: ${causa}\n  o que fazer: ${acao}` : "")
      );
    }
  }

  const { novos, atualizados, aposentados, vencedor } = calcularDiff(
    registros,
    aptos,
    canarios,
    motivosDeExclusao
  );

  // Portão 3: aposentar mais da metade dos ativos é sinal de instabilidade
  // parcial da Groq, não de limpeza legítima.
  const ativosHoje = Object.values(registros).filter((m) => m?.isActive).length;
  if (ativosHoje > 0 && aposentados.length > ativosHoje / 2 && !FORCAR) {
    abortar(
      `o sync aposentaria ${aposentados.length} de ${ativosHoje} modelos ativos. Use --force se for mesmo isso.`
    );
  }

  console.log("\n=========== DIFF ===========");
  console.log(`padrão eleito: ${vencedor?.modelId || "(nenhum)"}`);

  console.log(`\nnovos (${novos.length}):`);
  for (const { modelo, campos } of novos) {
    console.log(
      `  + ${modelo.modelId}  ctx=${modelo.contextWindow} out=${modelo.maxCompletionTokens}` +
        `${campos.tpmLimit ? ` tpm=${campos.tpmLimit}` : ""} [${modelo.features.join(", ")}]`
    );
  }

  console.log(`\natualizados (${atualizados.length}):`);
  for (const { modelo, antes, campos } of atualizados) {
    const mudancas = [];
    if (Number(antes.maxContext) !== modelo.contextWindow) {
      mudancas.push(`contexto ${antes.maxContext} -> ${modelo.contextWindow}`);
    }
    if (Number(antes.maxCompletionTokens || 0) !== modelo.maxCompletionTokens) {
      mudancas.push(`saída ${antes.maxCompletionTokens || "ausente"} -> ${modelo.maxCompletionTokens}`);
    }
    if (!antes.features) mudancas.push(`features ausentes -> [${modelo.features.join(", ")}]`);
  if (campos.tpmLimit && Number(antes.tpmLimit || 0) !== campos.tpmLimit) {
    mudancas.push(`tpm ${antes.tpmLimit || "ausente"} -> ${campos.tpmLimit}`);
  }
    if (antes.isActive === false) mudancas.push("reativado");
    console.log(`  ~ ${modelo.modelId}${mudancas.length ? `  (${mudancas.join("; ")})` : "  (sem mudança de capacidade)"}`);
  }

  console.log(`\naposentados (${aposentados.length}):`);
  for (const { modelId, motivo } of aposentados) {
    console.log(`  - ${modelId}  (${motivo})`);
  }

  if (!APLICAR) {
    console.log("\nDry-run: nada foi escrito. Rode com --apply para gravar.");
    process.exit(0);
  }

  // Escrita por caminho, nunca `set()` no nó: um set() no pai apagaria tudo o
  // que este script não conhece (a lição do courseQuizzes).
  const escritas = {};
  for (const { modelo, campos } of novos) {
    const chaveNova = db.ref("llmModels").push().key;
    escritas[chaveNova] = { ...campos, createdAt: agora() };
    console.log(`gravando novo ${modelo.modelId} em ${chaveNova}`);
  }
  for (const { chave: k, campos } of atualizados) {
    for (const [campo, valor] of Object.entries(campos)) {
      escritas[`${k}/${campo}`] = valor;
    }
  }
  for (const { chave: k, motivo, canario: canarioFalho } of aposentados) {
    escritas[`${k}/isActive`] = false;
    escritas[`${k}/isDefault`] = false;
    escritas[`${k}/retiredAt`] = agora();
    escritas[`${k}/retiredReason`] = motivo;
    if (canarioFalho) escritas[`${k}/canary`] = canarioFalho;
  }

  await db.ref("llmModels").update(escritas);
  console.log(`\nOK: ${Object.keys(escritas).length} caminhos atualizados.`);
  process.exit(0);
};

const chamadoDiretamente =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (chamadoDiretamente) await main();
