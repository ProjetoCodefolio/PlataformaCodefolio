/**
 * Política de escolha de modelo LLM.
 *
 * Módulo puro, sem Firebase e sem React, de propósito: a mesma regra precisa
 * valer no app (que resolve o modelo padrão quando o catálogo carrega) e no
 * script de sincronização do catálogo, que roda em node. Se as duas pontas
 * não concordarem, o seletor mostra um padrão e o banco marca outro.
 */

/**
 * Capacidade de saída do modelo, em tokens. É o número que limita quantas
 * questões cabem numa resposta. Enquanto o catálogo não trouxer o valor real
 * sincronizado da Groq, o campo pode não existir.
 * @param {object} modelo - Registro do nó `llmModels`
 * @returns {number}
 */
export const capacidadeDeSaida = (modelo) =>
  Number(modelo?.maxCompletionTokens) || 0;

/**
 * Janela de contexto do modelo, em tokens. Aceita o campo legado `maxContext`,
 * que é o único preenchido enquanto a sincronização automática não existe.
 * @param {object} modelo - Registro do nó `llmModels`
 * @returns {number}
 */
export const janelaDeContexto = (modelo) =>
  Number(modelo?.contextWindow) || Number(modelo?.maxContext) || 0;

const temRecurso = (modelo, recurso) => {
  const features = modelo?.features;
  if (Array.isArray(features)) return features.includes(recurso);
  if (features && typeof features === "object") return Boolean(features[recurso]);
  return false;
};

/**
 * Um modelo está disponível para uso quando o admin não o desativou. O
 * `overrideIsActive`, quando existe, é decisão humana declarada e vence o
 * estado calculado pela sincronização.
 * @param {object} modelo - Registro do nó `llmModels`
 * @returns {boolean}
 */
export const modeloEstaAtivo = (modelo) => {
  if (!modelo || !modelo.modelId) return false;
  if (typeof modelo.overrideIsActive === "boolean") return modelo.overrideIsActive;
  return Boolean(modelo.isActive);
};

/**
 * Filtra o catálogo para os modelos utilizáveis pelo gerador de questões.
 * @param {object[]} modelos - Registros do nó `llmModels`
 * @returns {object[]}
 */
export const modelosAtivos = (modelos) =>
  (Array.isArray(modelos) ? modelos : []).filter(modeloEstaAtivo);

/**
 * Ordena os modelos ativos do melhor para o pior, de forma determinística.
 *
 * Ordem de preferência:
 *   1. suporta `structured_outputs`;
 *   2. suporta `json_mode`;
 *   3. maior capacidade de saída (limita quantas questões cabem na resposta);
 *   4. maior janela de contexto (limita quanto do PDF cabe no prompt);
 *   5. `modelId` em ordem alfabética, como desempate final.
 *
 * Os dois primeiros critérios só desempatam quando o catálogo já traz as
 * features sincronizadas; com os dados de hoje eles são neutros e a decisão
 * cai em capacidade e contexto.
 *
 * É esta ordem que vira a cadeia de fallback quando um modelo some do
 * provedor: o próximo da fila é sempre o melhor que restou.
 *
 * @param {object[]} modelos - Registros do nó `llmModels`
 * @returns {object[]} - Ativos ordenados, do preferido ao último recurso
 */
export const ordenarPorPolitica = (modelos) =>
  [...modelosAtivos(modelos)].sort((a, b) => {
    const porRecurso = (recurso) =>
      Number(temRecurso(b, recurso)) - Number(temRecurso(a, recurso));

    return (
      porRecurso("structured_outputs") ||
      porRecurso("json_mode") ||
      capacidadeDeSaida(b) - capacidadeDeSaida(a) ||
      janelaDeContexto(b) - janelaDeContexto(a) ||
      String(a.modelId).localeCompare(String(b.modelId))
    );
  });

/**
 * Escolhe o modelo padrão entre os ativos.
 * @param {object[]} modelos - Registros do nó `llmModels`
 * @returns {object|null} - O modelo escolhido, ou null se não houver ativo
 */
export const escolherPadrao = (modelos) => ordenarPorPolitica(modelos)[0] || null;

/**
 * Monta a cadeia de modelos a tentar, começando pelo que o professor tem
 * selecionado e seguindo pela ordem da política. Sem isso, um modelo
 * aposentado pelo provedor vira erro na tela do professor, quando o app tem
 * catálogo suficiente para simplesmente tentar o próximo.
 *
 * Devolve os REGISTROS, não os ids: quem gera precisa de `contextWindow`,
 * `maxCompletionTokens` e `features` para montar o orçamento da chamada, e
 * cada modelo da cadeia tem os seus.
 *
 * @param {object[]} modelos - Registros do nó `llmModels`
 * @param {string} [modeloSelecionado] - `modelId` em uso agora
 * @returns {object[]} - Registros a tentar, na ordem, sem repetição
 */
export const cadeiaDeModelos = (modelos, modeloSelecionado) => {
  const ordenados = ordenarPorPolitica(modelos);
  const escolhido = ordenados.find((m) => m.modelId === modeloSelecionado);

  return [
    ...(escolhido ? [escolhido] : []),
    ...ordenados.filter((m) => m.modelId !== modeloSelecionado),
  ];
};

/**
 * Resolve qual `modelId` o gerador deve usar, na ordem: a preferência salva
 * pelo professor (se o modelo ainda estiver ativo), depois o padrão marcado
 * no banco pela sincronização, e por fim o cálculo da política.
 *
 * A rede final existe para que uma falha da sincronização não deixe o seletor
 * órfão, mandando para a Groq um nome de modelo que não existe mais.
 *
 * @param {object[]} modelos - Registros do nó `llmModels`
 * @param {string} [preferidoPeloUsuario] - `modelId` salvo em localStorage
 * @returns {string} - `modelId` a usar, ou string vazia se não houver ativo
 */
export const resolverModeloSelecionado = (modelos, preferidoPeloUsuario) => {
  const ativos = modelosAtivos(modelos);
  if (ativos.length === 0) return "";

  const salvoAindaVale = ativos.some((m) => m.modelId === preferidoPeloUsuario);
  if (salvoAindaVale) return preferidoPeloUsuario;

  const marcadoNoBanco = ativos.find((m) => m.isDefault);
  if (marcadoNoBanco) return marcadoNoBanco.modelId;

  return escolherPadrao(ativos)?.modelId || "";
};

/** Mínimos de capacidade para um modelo servir à geração de questões. */
export const CONTEXTO_MINIMO = 8192;
export const SAIDA_MINIMA = 2048;

/**
 * Converte um registro cru do `GET /openai/v1/models` da Groq para o formato
 * do nó `llmModels`. Só os campos de que a plataforma depende: o resto da
 * resposta (preço, parâmetros de amostragem, hugging_face_id) não é problema
 * nosso e envelheceria no banco sem ninguém ler.
 *
 * @param {object} bruto - Registro como a Groq devolve
 * @returns {object} - Registro no formato do catálogo
 */
export const normalizarModeloDaGroq = (bruto = {}) => ({
  modelId: bruto.id,
  name: bruto.name || bruto.id,
  contextWindow: Number(bruto.context_window) || 0,
  maxCompletionTokens: Number(bruto.max_completion_tokens) || 0,
  ownedBy: bruto.owned_by || "",
  inputModalities: bruto.input_modalities || [],
  outputModalities: bruto.output_modalities || [],
  features: bruto.supported_features || [],
  activeNaGroq: bruto.active !== false,
});

/**
 * Decide se um modelo serve para gerar questões, por capacidade declarada.
 *
 * Substitui a regex de nome (`/whisper|tts|guard|playai/i`), que excluía por
 * palavra no identificador e por isso barrava o `openai/gpt-oss-safeguard-20b`
 * por causa de "guard". Aqui o que decide é o que o modelo sabe fazer, e
 * excluir um modelo apto vira decisão declarada em `denyPatterns`.
 *
 * Não cobre o que só a chamada real revela (cota, tier, política da conta):
 * disso cuida o canário do script de sincronização.
 *
 * @param {object} modelo - Registro já normalizado
 * @param {string[]} [denyPatterns] - Expressões regulares de exclusão declarada
 * @returns {{apto: boolean, motivo: string|null}}
 */
export const isModeloApto = (modelo, denyPatterns = []) => {
  const reprovar = (motivo) => ({ apto: false, motivo });

  if (!modelo?.modelId) return reprovar("sem modelId");

  const entrada = modelo.inputModalities || [];
  const saida = modelo.outputModalities || [];
  if (!entrada.includes("text")) return reprovar(`entrada não é texto (${entrada.join(", ") || "?"})`);
  if (!saida.includes("text")) return reprovar(`saída não é texto (${saida.join(", ") || "?"})`);

  if (!temRecurso(modelo, "json_mode")) return reprovar("sem json_mode");

  const contexto = janelaDeContexto(modelo);
  if (contexto < CONTEXTO_MINIMO) return reprovar(`contexto ${contexto} < ${CONTEXTO_MINIMO}`);

  const saidaMaxima = capacidadeDeSaida(modelo);
  if (saidaMaxima < SAIDA_MINIMA) return reprovar(`saída ${saidaMaxima} < ${SAIDA_MINIMA}`);

  const banido = (denyPatterns || []).find((padrao) => {
    try {
      return new RegExp(padrao, "i").test(modelo.modelId);
    } catch {
      // Padrão inválido no banco não pode derrubar o sync inteiro.
      console.warn(`denyPattern inválido ignorado: ${padrao}`);
      return false;
    }
  });
  if (banido) return reprovar(`excluído por denyPattern "${banido}"`);

  return { apto: true, motivo: null };
};
