# Plano: sincronização automática do catálogo de modelos LLM

Status: planejado, não implementado. A semente da fase 1 já existe: `src/api/services/courses/llmModelPolicy.js` nasceu com o passo 1a do plano de recuperação, com `escolherPadrao` e `resolverModeloSelecionado` testados, e é onde `isModeloApto` e `normalizarModeloDaGroq` entram. Escrito em 18/09/2026.

Restrição que guia todo o desenho: **mínimo de mão humana**. O catálogo se mantém sozinho, inclusive ativando e aposentando modelos, e o admin só entra por exceção. Uma requisição por dia ao endpoint da Groq é aceitável e é o que este plano assume.

## 1. Por que

Medições feitas em 18/09/2026 contra a API da Groq e contra o banco de produção:

- `GET https://api.groq.com/openai/v1/models` (exige a chave, não é anônimo) devolve 13 modelos na conta atual;
- dos 8 modelos que o seletor do gerador oferece hoje, **4 não existem mais**: `qwen/qwen3-32b`, `llama-3.1-8b-instant`, `meta-llama/llama-4-scout-17b-16e-instruct` e `llama-3.3-70b-versatile`;
- o morto mais grave é o `llama-3.3-70b-versatile`, que é o **padrão hardcoded** em `useGroqSettings.js`. Chamada real: `HTTP 404 model_not_found` em 263ms. Quem abre o gerador e não troca o modelo na mão não gera questão nenhuma;
- entre os 4 vivos, o `maxContext` cadastrado à mão está errado para menos em todos: `openai/gpt-oss-120b` está como 65536 e é 131072; `groq/compound-mini` está como 32768 e é 131072;
- o app nem sequer tem o campo `max_completion_tokens`, que é o teto real de saída e o número que o orçamento de tokens do `groqClient.js` deveria respeitar.

Ou seja: o catálogo é mantido por digitação humana, envelhece em silêncio, e o app descobre o envelhecimento na cara do professor.

## 2. Fonte da verdade

O endpoint devolve, por modelo, exatamente o que falta: `id`, `context_window`, `max_completion_tokens`, `owned_by`, `active`, `input_modalities`, `output_modalities`, `supported_features` (`json_mode`, `structured_outputs`, `tools`, `reasoning`) e `name`.

**Metadado não basta.** Um modelo pode constar no catálogo e mesmo assim recusar a nossa chamada (cota, tier, política). Por isso o sync não acredita só na lista: ele faz um **canário** por modelo candidato, uma chamada mínima de chat completion pedindo `{"ok":true}`. Medido hoje: ~200 tokens e menos de 1s por modelo, ~2.600 tokens por dia para os 13. Só entra no catálogo ativo o modelo que responder.

Armadilha descoberta no canário e que vale para a geração real: com `response_format: {type: "json_object"}` e `max_tokens` apertado, a Groq responde **400 `json_validate_failed`** em vez de devolver JSON cortado. Modo JSON exige orçamento de saída suficiente para fechar o JSON. O canário usa `max_tokens: 128`.

## 3. Contrato do nó `llmModels`

Chave do nó continua sendo a push id; a **chave natural de casamento é `modelId`**.

Campos e donos:

| campo | dono | origem |
|---|---|---|
| `modelId` | Groq | `id` |
| `name` | Groq, com override | `name`, só escrito se o admin não tiver renomeado |
| `contextWindow` | Groq | `context_window` |
| `maxCompletionTokens` | Groq | `max_completion_tokens` |
| `ownedBy` | Groq | `owned_by` |
| `inputModalities` / `outputModalities` | Groq | idem |
| `features` | Groq | `supported_features` |
| `activeNaGroq` | Groq | `active` |
| `canary` | sync | `{ ok, at, status, errorCode, latencyMs }` |
| `isActive` | **sync** | calculado (ver 3.1), a menos que exista `overrideIsActive` |
| `isDefault` | **sync** | calculado (ver 3.2), um único vencedor |
| `overrideIsActive` | admin | ausente por padrão; quando existe, vence e o sync não encosta |
| `retiredAt` / `retiredReason` | sync | preenchidos ao aposentar |
| `syncedAt` | sync | ISO do último sync |
| `maxContext` | legado | mantido em espelho de `contextWindow` durante a migração |

`maxContext` continua sendo escrito enquanto o app antigo estiver no ar, e some na fase 4.

### 3.1 Regra de aptidão (substitui a regex de nome)

Um modelo é apto quando:

1. `input_modalities` inclui `text` e `output_modalities` inclui `text`;
2. `supported_features` inclui `json_mode` (a pipeline precisa de JSON na saída);
3. `context_window >= 8192`;
4. `max_completion_tokens >= 2048`;
5. `modelId` não casa com nenhum padrão de `llmModelPolicy/denyPatterns` no banco;
6. o canário respondeu 200 com JSON válido.

Com os dados de hoje isso descarta sozinho: whisper (entrada de áudio), orpheus (saída de fala), prompt-guard (contexto 512), allam-2-7b (contexto 4096). A regex atual `/whisper|tts|guard|playai/i` sai de cena, e com ela o acidente de excluir `openai/gpt-oss-safeguard-20b` por causa da palavra "guard" no nome: se ele deve ficar de fora, entra em `denyPatterns`, que é decisão declarada e não efeito colateral.

### 3.2 Escolha do padrão

Determinística, porque script e app precisam concordar:

1. só entre aptos;
2. prefere `structured_outputs`, depois `json_mode`;
3. depois maior `maxCompletionTokens` (é ele que limita quantas questões cabem numa resposta);
4. depois maior `contextWindow`;
5. desempate final por `modelId` em ordem alfabética.

Com os dados de hoje o vencedor é `openai/gpt-oss-120b` (131072 de contexto, 65536 de saída, `structured_outputs`).

A função vive em `src/api/services/courses/llmModelPolicy.js`, **pura e sem dependência de Firebase**, importada tanto pelo script em node quanto pelo app. O app recalcula com a mesma função quando nenhum registro traz `isDefault`, então uma falha do sync não deixa o seletor órfão.

## 4. O script

`scripts/syncLlmModels.mjs`, no mesmo molde dos outros (`--apply` para gravar, dry-run por padrão, `initAdminDb` de `scripts/lib/firebaseAdmin.mjs`).

Fluxo:

1. `GET /openai/v1/models` com `GROQ_API_KEY`;
2. portão de sanidade da lista: resposta precisa ser 200, com array não vazio; abaixo de um mínimo configurável (`--min-modelos`, padrão 5) aborta sem escrever;
3. filtra candidatos pela aptidão de metadado (itens 1 a 5 da regra);
4. canário sequencial nos candidatos, com pausa de 1s entre chamadas para não bater no rate limit;
5. portão de sanidade do canário: se **nenhum** candidato passar, aborta sem escrever e sai com código diferente de zero. Sem esse portão, uma chave revogada aposentaria o catálogo inteiro;
6. portão de aposentadoria em massa: se o sync for desativar mais da metade dos que hoje estão ativos, aborta e pede `--force`. Protege contra instabilidade parcial da Groq;
7. calcula o diff em três conjuntos: **novos** (inserir), **sumidos** (aposentar, nunca apagar), **existentes** (atualizar só campos de capacidade);
8. grava com `update()` por caminho, nunca `set()` no nó (a mesma lição do `courseQuizzes`);
9. imprime o resumo do diff, que no CI vira o summary do job.

Aposentar é `isActive: false` mais `retiredAt` e `retiredReason` (`ausente na API` ou `canário falhou: <código>`). Nunca `remove()`: o registro é histórico e é a explicação de por que um modelo sumiu do seletor.

## 5. Gatilhos

**Diário no CI (principal).** Novo workflow `.github/workflows/sync-llm-models.yml`, com `schedule` diário e `workflow_dispatch`. Os dois segredos já existem no repositório: `VITE_GROQ_API_KEY` e `FIREBASE_SERVICE_ACCOUNT`. Nenhuma infra nova, nenhuma mão humana. Falha do job já notifica pelos canais padrão do GitHub. Atenção a uma pegadinha do GitHub Actions: workflows agendados em repositório sem atividade podem ser suspensos, então o `workflow_dispatch` fica como resgate manual.

**Auto-cura no 404 (complementar, e é o único que resolve no tempo do professor).** Ao receber `MODEL_NOT_FOUND` na geração, o app não mostra erro direto: recarrega o catálogo, escolhe o próximo modelo apto pela função de política e repete a chamada uma vez. Só falha se a segunda tentativa também falhar, e aí a mensagem diz qual modelo foi tentado. O cliente não grava no banco, porque as regras só deixam admin escrever em `llmModels`; quem consolida é o cron seguinte.

**Botão na tela de admin (opcional).** `AdminLlmModels.jsx` ganha "Sincronizar agora", que roda a mesma política no navegador. Útil quando o admin está olhando a lista e não quer esperar o cron. Não é necessário para o plano funcionar.

## 6. Mudanças no app

**`src/api/services/courses/llmModelPolicy.js` (novo, puro).** `isModeloApto(modelo)`, `escolherPadrao(modelos)`, `normalizarModeloDaGroq(bruto)`. É o único lugar onde a regra mora.

**`useGroqSettings.js`.** Sai o `useState("llama-3.3-70b-versatile")` e sai a regex `NON_CHAT_MODEL_PATTERN`. O seletor passa a listar `isActive`, e o padrão vem do `isDefault` do banco, com `escolherPadrao` como rede. O modelo salvo em `localStorage` continua sendo respeitado apenas se ainda estiver na lista ativa, que é o comportamento de hoje e já está certo.

**`pdfExtraction.js` e `groqClient.js`.** Param de importar `GROQ_MODELS` e passam a receber o registro do modelo já resolvido (com `contextWindow` e `maxCompletionTokens`), em vez de procurar por conta própria. Some o default silencioso de 8192 que hoje corta o PDF em 16.384 caracteres para quase todos os modelos.

**Orçamento de tokens (é aqui que o sync paga o investimento).** O `max_tokens` passa a ser calculado a partir do que foi pedido (~110 tokens por questão, medido em 102 nas questões reais do "Aulão", com folga), limitado por `maxCompletionTokens` do modelo. O tamanho do texto do PDF passa a ser o que sobra de `contextWindow` depois de reservar a saída, em vez de "metade do contexto" decidida em outro arquivo. As duas contas passam a viver no mesmo lugar e a conversar.

**Modo JSON.** Quando `features` inclui `json_mode`, mandar `response_format: {type: "json_object"}`, lembrando que isso exige orçamento de saída suficiente, senão a resposta é 400 `json_validate_failed`. Com `structured_outputs` dá para ir além e fixar o schema, o que aposenta boa parte das cinco tentativas de salvamento do `responseParser.js`.

**`AdminLlmModels.jsx`.** O formulário de criar e editar modelo à mão deixa de ser a porta principal. `contextWindow`, `maxCompletionTokens`, modalidades e features viram somente leitura, com a data do último sync e o resultado do canário visíveis. Sobram para o admin apenas os dois controles de exceção: `overrideIsActive` e a lista `denyPatterns`.

## 7. Fases

1. **Política e script.** `llmModelPolicy.js` com testes, `scripts/syncLlmModels.mjs` com dry-run. Nada em produção ainda: roda dry-run e confere o diff na mão uma vez.
2. **Cron.** Workflow diário com `--apply`. A partir daqui o catálogo se mantém sozinho, e o 404 do padrão desaparece na primeira execução.
3. **Consumo no app.** `useGroqSettings`, `pdfExtraction`, `groqClient`, orçamento de tokens e modo JSON. É o commit que faz a geração melhorar de verdade.
4. **Limpeza.** Remover `GROQ_MODELS` do `constants.js`, parar de escrever `maxContext`, e tornar o formulário do admin somente leitura nos campos sincronizados.

A auto-cura no 404 pode entrar junto com a fase 3.

## 8. Testes

- `llmModelPolicy`: aptidão (áudio entra e sai de fora, contexto pequeno de fora, `json_mode` obrigatório, `denyPatterns`), escolha do padrão (incluindo empate resolvido pelo `modelId`) e normalização do registro bruto da Groq;
- diff do sync, como função pura sobre duas listas: novos, sumidos, alterados, e o caso "nada mudou" não gerando escrita;
- portões de sanidade: lista vazia, lista curta, nenhum canário passando, aposentadoria em massa;
- app: com catálogo só de modelos aposentados, o seletor não quebra e a mensagem é clara.

## 9. Riscos e modos de falha

- **Groq fora do ar no horário do cron.** O job falha, nada é escrito, o catálogo do dia anterior continua valendo. É o comportamento desejado.
- **Chave revogada.** Todos os canários falham, o portão do item 5 aborta, ninguém é aposentado, e o job falha visivelmente.
- **Modelo novo ruim ativado automaticamente.** É o preço de tirar a mão humana. Mitigação: o canário, a exigência de `json_mode` e os `denyPatterns`. Se algo escapar, o admin resolve com `overrideIsActive` e o sync respeita.
- **Chave da Groq no bundle.** `VITE_GROQ_API_KEY` vai embutida no JS público hoje, ou seja, qualquer visitante consegue extrair. O sync no CI não piora isso, mas o botão de admin e a auto-cura continuam usando a chave do navegador. Tratar isso (proxy no worker que já existe) é assunto próprio, fora deste plano.

## 10. Fora de escopo

Trocar de provedor, mexer na Question Generator API (que está desligada por falta de `VITE_QUESTION_API_BASE_URL` no CI), e acabar com a fabricação de questões "(variação N)" no `groqClient`. Esse último é urgente, mas é independente deste plano e deve ir em commit próprio.
