# Plano de recuperação do gerador de questões

Status, atualizado em 18/09/2026: **passo 1 implementado** (1a e 1b), passo 2 pendente, passo 3 com o item 3 das "correções obrigatórias no cliente" feito e o resto bloqueado na decisão de proxy. Escrito em 18/09/2026.

Este documento é o mapa. O passo 2 tem plano próprio e detalhado em `plano_sincronizacao_modelos_llm.md`; aqui ele aparece resumido, no lugar certo da ordem.

## O que está acontecendo hoje

Verificado em 18/09/2026, com chamadas reais:

- o modelo que o app manda por padrão para a Groq, `llama-3.3-70b-versatile`, **não existe mais**: `HTTP 404 model_not_found` em 263ms. Quem abre o gerador e não troca o modelo na mão não gera nada;
- dos 8 modelos que o seletor oferece, 4 estão mortos. Sobram `openai/gpt-oss-120b`, `openai/gpt-oss-20b`, `groq/compound` e `groq/compound-mini`;
- o provedor primário (Question Generator API, GPT-5.5) está desligado em produção: o bundle publicado traz `__vite_import_meta_env__={}`, ou seja, foi buildado sem `VITE_QUESTION_API_BASE_URL`. Confirmado por controle: buildando com a variável, o valor aparece no bundle;
- quando faltam questões válidas, o `groqClient` **inventa** o que faltou, duplicando questões com "(variação N)", e o toast diz "N questões geradas com sucesso!".

Os três problemas são independentes. O primeiro é o que trava a geração hoje, e não depende de VM, de proxy nem de ninguém de fora.

## Passo 1: destravar a geração (hoje) — FEITO

### 1a. O padrão para de ser um nome fixo no código — FEITO

Implementado no commit `feat(quiz): resolver o modelo padrao pelo catalogo ativo`. Falta apenas o passo de banco: desativar pelo admin os 4 modelos mortos.

Hoje `useGroqSettings.js` começa com `useState("llama-3.3-70b-versatile")` e só troca se o `localStorage` tiver um modelo que ainda esteja na lista. Desativar o modelo morto no admin **não basta**: o app continua mandando o nome fixo até o professor escolher outro na mão.

Mudanças:

- criar `src/api/services/courses/llmModelPolicy.js`, puro e sem Firebase, com `escolherPadrao(modelos)`. Regra determinística: entre os ativos, prefere maior capacidade de saída, depois maior contexto, com desempate alfabético por `modelId`. Este arquivo é a semente que o passo 2 preenche, então nasce aqui e não é jogado fora depois;
- `useGroqSettings.js`: `selectedModel` começa vazio e é resolvido quando o catálogo carrega, por `escolherPadrao`. O `localStorage` continua sendo respeitado só se o modelo ainda estiver ativo, que é o comportamento atual e está correto;
- guarda de lista vazia: se nenhum modelo ativo sobrar, o botão de gerar fica desabilitado com uma mensagem clara, em vez de disparar uma requisição fadada ao 404.

No banco, pelo admin: desativar `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`, `qwen/qwen3-32b` e `meta-llama/llama-4-scout-17b-16e-instruct`. São dois minutos de tela, e o passo 2 depois faz isso sozinho para sempre.

### 1b. O app para de inventar questão — FEITO

Implementado no commit `fix(quiz): parar de fabricar questoes duplicadas na geracao`.

Independente do 1a, e do mesmo tamanho. No `groqClient.js`, remover o trecho que completa a lista duplicando questões com "(variação N)". Em vez disso, devolver o que veio e informar: "foram pedidas 30 e vieram 12". A interface mostra o número real, e o professor decide se gera mais.

Sem isso, o passo 1a devolve a geração ao ar mas a qualidade continua ruim para pedidos grandes, e o relato de "não funciona bem" continua válido.

### Como saber que deu certo

Abrir o gerador e conferir que o modelo pré-selecionado é um dos vivos. Gerar 5 questões a partir de um PDF pequeno e ver 5 questões reais, sem nenhuma "(variação N)". Pedir 30 de um PDF grande e ver a mensagem honesta de quantas vieram.

### Testes

Unidade de `escolherPadrao` (lista vazia, todos inativos, empate resolvido pelo `modelId`) e do ajuste de quantidade no `groqClient` (vieram menos: devolve o que veio, sem inventar; vieram mais: corta no pedido).

## Passo 2: o catálogo se mantém sozinho

Plano completo em `plano_sincronizacao_modelos_llm.md`. Resumo: script `scripts/syncLlmModels.mjs` puxa `GET /openai/v1/models` da Groq, roda um canário por modelo candidato (chamada mínima pedindo `{"ok":true}`, ~200 tokens cada), e grava no nó `llmModels` quem está apto, quem entrou e quem foi aposentado, sem apagar nada. Gatilho: cron diário no CI que já existe, mais `workflow_dispatch`, mais auto-cura no 404 dentro do app. Mão humana só por exceção (`overrideIsActive` e `denyPatterns`).

Por que depois do passo 1: o passo 1 resolve hoje, o passo 2 garante que não volte. E o passo 2 traz `contextWindow` e `maxCompletionTokens` reais, que são o insumo do conserto do orçamento de tokens (o `max_tokens` hoje cai no piso de 1024 e só cabem ~10 questões por resposta).

## Passo 3: religar o GPT-5.5

### O que já se sabe

- a VM está viva: `GET http://136.248.124.114:8000/health` responde `{"ok":true,"model":"gpt-5.5","chatgpt_authenticated":true}`. O valor perdido de `VITE_QUESTION_API_BASE_URL` era esse endereço;
- a geração pela API falhou no teste com payload mínimo: `{"detail":{"error":"question_generation_failed","message":"Model response did not include questions."}}`. **Falta saber o código HTTP dessa resposta**, e ele decide o comportamento do app (ver "pendências");
- o cliente **não manda a chave** que o contrato documentado exige (`Authorization: Bearer <QUESTION_API_KEY>` ou `X-API-Key`). Hoje a VM não exige, mas 401 não está na lista de erros recuperáveis, então no dia em que exigir, a geração morre inteira em vez de cair para a Groq.

### Bloqueio de protocolo

Preencher a variável com esse endereço não resolve: a plataforma serve HTTPS e a API é HTTP, e o navegador recusa a chamada por conteúdo misto. O erro vira erro de rede, que o `shouldFallbackToGroq` trata como recuperável, e tudo volta para a Groq em silêncio. Dois caminhos:

- **proxy no Cloudflare Worker (recomendado).** Vocês já têm worker para e-mail. Ele é HTTPS, fala com a VM por HTTP do lado servidor, e o navegador só enxerga o worker. Não depende de acesso à VM nem de DNS, e abre caminho para tirar a chave da Groq de dentro do bundle;
- **HTTPS na própria VM**, com domínio e certificado, como o doc de integração recomenda. Depende de outra pessoa e de DNS.

### Correções obrigatórias no cliente antes de ligar

1. mandar `Authorization: Bearer` (ou `X-API-Key`), com a chave vindo de variável, e tratar 401 como erro de configuração visível, não como silêncio;
2. validar a resposta como a da Groq é validada. Hoje `normalizeQuestionApiResponse` mapeia às cegas: questão sem `options` vira `{options: [], correctOption: 0}`, uma múltipla escolha com zero alternativas, e é gravada assim;
3. corrigir `resolveCorrectOption`. Ele só entende letra sozinha e texto exato; nas outras formas devolve 0 e marca a primeira alternativa como correta, sem avisar. Testadas 8 formas comuns, 5 dão gabarito errado (número, `"B)"`, `"B) Paris"`, ausente). O contrato documentado usa letra, que funciona, mas o custo de errar é alto demais para depender de o provedor nunca mudar de formato;
4. tratar resposta sem `questions` como falha explícita. Se a API devolver o corpo de erro com HTTP 200, hoje o app entende sucesso com zero questões e mostra "0 questões geradas com sucesso!", sem fallback.

### Como saber que deu certo

Gerar por PDF e ver o chip roxo do provedor (GPT-5.5) na tela, com as questões chegando. Derrubar a API de propósito e ver a geração cair para a Groq, com o chip âmbar, sem erro para o professor.

## Pendências que bloqueiam decisão

- **Código HTTP do `question_generation_failed`.** 502 significa que o fallback já funciona como desenhado. 400 significa nenhum fallback, por desenho. 200 significa o pior caso, sucesso vazio e silencioso. O comando está no histórico da conversa e é um `curl` com `-w '%{http_code}'`;
- **Proxy ou HTTPS na VM**, decisão do passo 3;
- **Chave da Groq exposta.** Ela está embutida no JS público do site (`gsk_...`), qualquer visitante extrai. Rotacionar, e considerar mandar também as chamadas da Groq pelo proxy. É assunto próprio, não bloqueia nenhum dos três passos.

## Ordem sugerida e o que cada passo entrega

| passo | entrega | depende de |
|---|---|---|
| 1a | geração volta a funcionar | nada |
| 1b | para de entregar questão inventada | nada |
| 2 | catálogo sempre válido, sem mão humana | 1a (usa o mesmo `llmModelPolicy.js`) |
| 2+ | orçamento de tokens correto, mais questões por resposta | campos sincronizados no passo 2 |
| 3 | GPT-5.5 como provedor primário | decisão de proxy e correções no cliente |
