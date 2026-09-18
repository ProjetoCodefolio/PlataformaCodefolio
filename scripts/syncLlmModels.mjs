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

const listarModelosDaGroq = async (chave) => {
  const resposta = await fetch(`${GROQ_BASE}/models`, {
    headers: { Authorization: `Bearer ${chave}` },
  });
  if (!resposta.ok) {
    abortar(`GET /models devolveu ${resposta.status}. Nada foi escrito.`);
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
    if (!resposta.ok) {
      const corpo = await resposta.text().catch(() => "");
      let errorCode = String(resposta.status);
      try {
        errorCode = JSON.parse(corpo)?.error?.code || errorCode;
      } catch {
        // corpo não-JSON: fica o status
      }
      return { ok: false, at: agora(), status: resposta.status, errorCode, latencyMs };
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
      };
    }
    return { ok: true, at: agora(), status: 200, errorCode: null, latencyMs };
  } catch (erro) {
    return {
      ok: false,
      at: agora(),
      status: 0,
      errorCode: erro?.name || "erro_de_rede",
      latencyMs: Date.now() - inicio,
    };
  }
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
  const ler = async (caminho) => {
    const r = await fetch(`${RTDB}/${caminho}.json`);
    if (!r.ok) abortar(`GET ${caminho} devolveu ${r.status}`);
    return r.json();
  };

  // `llmModelPolicy` não é de leitura pública e é opcional: sem ele o dry-run
  // roda sem exclusões declaradas, e avisa que a lista pode diferir do que o
  // --apply vai enxergar. Abortar aqui esconderia o diff por causa de um nó
  // que na maioria das vezes nem existe.
  let denyPatterns = [];
  const resposta = await fetch(`${RTDB}/llmModelPolicy/denyPatterns.json`);
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

    // Nome renomeado pelo admin não é sobrescrito.
    if (existente?.name && existente.name !== modelo.name) campos.name = existente.name;
    // `overrideIsActive` é decisão humana declarada: o sync não encosta.
    if (typeof existente?.overrideIsActive === "boolean") delete campos.isActive;

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
    if (canarioFalho) motivo = `canário falhou: ${canarioFalho.errorCode}`;
    else if (motivoDeMetadado) motivo = `não serve para gerar questões: ${motivoDeMetadado}`;
    else motivo = "ausente na API da Groq";

    aposentados.push({ chave: existente.chave, modelId, motivo });
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
      const resultado = await canario(chave, modelo.modelId);
      canarios.set(modelo.modelId, resultado);
      console.log(
        `  ${resultado.ok ? "ok     " : "FALHOU "} ${modelo.modelId}  ${resultado.latencyMs}ms` +
          (resultado.ok ? "" : `  (${resultado.errorCode})`)
      );
      await dormir(PAUSA_ENTRE_CANARIOS_MS);
    }

    // Portão 2: nenhum canário passando é sintoma de chave revogada, não de
    // catálogo morto. Sem este portão, um problema de credencial aposentaria
    // o catálogo inteiro.
    if (aptos.length > 0 && [...canarios.values()].every((c) => !c.ok)) {
      abortar("nenhum candidato passou no canário. Chave revogada ou Groq fora do ar.");
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
  for (const { modelo } of novos) {
    console.log(
      `  + ${modelo.modelId}  ctx=${modelo.contextWindow} out=${modelo.maxCompletionTokens} [${modelo.features.join(", ")}]`
    );
  }

  console.log(`\natualizados (${atualizados.length}):`);
  for (const { modelo, antes } of atualizados) {
    const mudancas = [];
    if (Number(antes.maxContext) !== modelo.contextWindow) {
      mudancas.push(`contexto ${antes.maxContext} -> ${modelo.contextWindow}`);
    }
    if (Number(antes.maxCompletionTokens || 0) !== modelo.maxCompletionTokens) {
      mudancas.push(`saída ${antes.maxCompletionTokens || "ausente"} -> ${modelo.maxCompletionTokens}`);
    }
    if (!antes.features) mudancas.push(`features ausentes -> [${modelo.features.join(", ")}]`);
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
  for (const { chave: k, motivo } of aposentados) {
    escritas[`${k}/isActive`] = false;
    escritas[`${k}/isDefault`] = false;
    escritas[`${k}/retiredAt`] = agora();
    escritas[`${k}/retiredReason`] = motivo;
  }

  await db.ref("llmModels").update(escritas);
  console.log(`\nOK: ${Object.keys(escritas).length} caminhos atualizados.`);
  process.exit(0);
};

const chamadoDiretamente =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (chamadoDiretamente) await main();
