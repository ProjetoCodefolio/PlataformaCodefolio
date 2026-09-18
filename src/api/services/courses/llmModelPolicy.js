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
 * @param {object[]} modelos - Registros do nó `llmModels`
 * @param {string} [modeloSelecionado] - `modelId` em uso agora
 * @returns {string[]} - `modelId`s a tentar, na ordem, sem repetição
 */
export const cadeiaDeModelos = (modelos, modeloSelecionado) => {
  const ordenados = ordenarPorPolitica(modelos).map((m) => m.modelId);
  const primeiro = ordenados.includes(modeloSelecionado) ? [modeloSelecionado] : [];

  return [...primeiro, ...ordenados.filter((id) => id !== modeloSelecionado)];
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
