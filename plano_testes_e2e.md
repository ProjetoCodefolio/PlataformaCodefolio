# Plano: testes de ponta a ponta (E2E) com Playwright

Status: **etapas 0 a 3 implementadas em 29/09/2026** na branch `test/e2e-playwright`; etapas 4 a 6 pendentes. Escrito em 29/09/2026.

## Por que

Hoje o CI roda 910 testes (lint, build, unitários, fluxos no emulador e regras do banco), mas nenhum abre o site num navegador. Um botão que não responde, uma rota que renderiza em branco ou uma tela que quebra depois de mudar um hook passam direto se a lógica por trás estiver certa. Os testes E2E fecham essa lacuna: o Playwright abre o site de verdade, clica como o usuário e confere o que aparece na tela.

## Viabilidade

**É viável**, e a maior parte da infraestrutura já existe: o `firebase.json` já declara os emuladores de Database (9000), Auth (9099) e Hosting (5000), o CI já sobe o emulador com Java 21, e o repositório é público, então os minutos do GitHub Actions são gratuitos. Custo estimado por execução: uns 2 a 4 minutos a mais no CI (instalar o Chromium leva cerca de 1 minuto, com cache menos).

Há quatro obstáculos, todos contornáveis:

1. **Login só com Google (popup).** `src/api/services/auth.js` usa `signInWithPopup`, e `src/api/config/firebase.js` conectava só o Database ao emulador, deixando o Auth de fora de propósito (para o login local continuar sendo o Google real). Solução: o modo `VITE_MODE=e2e` conecta **também** o Auth ao emulador, que aceita os tokens emitidos por ele no Database emulator, então as regras de segurança (`auth.uid`) valem de verdade. O modo local continua como está. O popup em si ficou **fora do E2E** (ver etapa 2): o teste loga por um atalho, sem popup.
2. **Dados.** Cada teste precisa de um banco conhecido (curso, vídeos, quiz, usuários com papel `admin`/professor/aluno). Solução: fixtures em JSON gravadas direto no emulador via REST com `Authorization: Bearer owner` (o mesmo truque que `src/app/dev/localPublicationCron.js` já usa), e banco zerado entre os testes.
3. **Player do YouTube.** O progresso depende de `player.getCurrentTime()` da API do YouTube (`react-youtube`, em `VideoPlayer.jsx`), que carrega um iframe externo: lento, instável e sem controle do tempo. Solução: o Playwright intercepta `youtube.com/iframe_api` com `page.route` e serve um stub mínimo do `YT.Player` que deixa o teste dizer "o vídeo está em 95%". O resto do caminho (hooks de progresso, gravação no banco, cadeado sequencial) roda de verdade.
4. **Serviços externos.** Groq (gerador de quiz), Worker de e-mail e Analytics não podem ser chamados. Analytics e e-mail já ficam desligados fora do build de produção. Por garantia, o Playwright bloqueia qualquer requisição que não seja `localhost` (exceto as fontes do Google Fonts, se necessário).

Um ponto a favor: `publication.js` calcula a hora como `Date.now()` + `.info/serverTimeOffset`, então `page.clock` do Playwright consegue avançar o relógio e testar a publicação programada sem esperar.

## Quando roda

- **Em todo PR para a `main`**: é aqui que o E2E mais ajuda, porque barra a regressão **antes** do merge.
- **Em todo push na `main`** (ou seja, quando um PR é aceito): o `deploy` passa a depender de `test` **e** de `e2e` (`needs: [test, e2e]`). Se o E2E falhar, o site não é atualizado.
- **Opcional, depois do deploy**: um smoke test só de leitura contra o site no ar (a página abre, o catálogo lista cursos, não há erro no console). Não loga nem grava nada em produção.

O E2E roda num job separado do `test`, em paralelo, para não somar o tempo dos dois.

## Fluxos cobertos

Prioridade 1 (primeira entrega):

1. **Visitante**: a página inicial e o `/cursos` carregam, e o curso de exemplo aparece no catálogo.
2. **Login**: ~~o aluno entra pelo botão "Entrar com Google"~~. Fora do E2E por decisão de 29/09/2026 (ver etapa 2); o botão é conferido à mão.
3. **Acesso ao curso**: entra num curso aberto direto; num curso fechado, o PIN errado é recusado e o certo libera (gate único do `Classes`).
4. **Assistir vídeo**: com o stub do YouTube em 95%, o vídeo aparece como assistido, o progresso do curso sobe e o próximo vídeo destrava.
5. **Quiz**: o aluno responde, vê a nota, e a tentativa é contada uma vez só (fechar o quiz sem enviar não conta).

Prioridade 2:

6. **Publicação programada**: o professor programa um vídeo para amanhã; o aluno não vê o vídeo; com `page.clock` avançado um dia, o vídeo aparece.
7. **Professor edita quiz**: cria uma questão, edita outra inline e confere que só a editada mudou (regressão da identidade por `question.id`).
8. **Painel admin**: `/admin-panel` e `/adm-cursos` carregam para o admin e redirecionam o aluno.

Mais fluxos entram depois pela mesma regra do resto da suíte: **toda funcionalidade nova ou bug de tela corrigido traz o seu teste E2E no mesmo PR**.

## Estrutura

```
e2e/
  fixtures/        JSON de cada cenário (curso aberto, curso fechado, quiz...)
  support/
    emulator.js    zerar e semear o banco, criar usuários no Auth emulator
    login.js       login pela tela falsa do emulador
    youtubeStub.js stub do YT.Player
  visitante.spec.js
  login.spec.js
  ...
playwright.config.js
```

- `vitest` não pega esses arquivos: o `include` do `vite.config.js` só olha `src/`, `scripts/` e `emailWorker/src/`.
- Seletores por papel e texto (`getByRole`, `getByText`), como o usuário enxerga. `data-testid` só onde não houver alternativa (hoje existem 3 no projeto).
- Só Chromium no começo. Firefox e WebKit ficam para depois, se aparecer bug específico de navegador.
- Em falha, o CI guarda trace, screenshot e vídeo como artefato, para abrir com `npx playwright show-trace`.

## Etapas

**Etapa 0: modo E2E no app. Feita.** A escolha do modo saiu de `firebase.js` para `src/api/config/runtimeMode.js`, que é puro e tem teste. Com `VITE_MODE=e2e`, banco e login vão para o emulador mesmo num `vite build`, e o e-mail de notificação fica desligado mesmo quando forçado (antes ele ligava em qualquer build, e o de E2E também é um build). `npm run build:e2e` gera o build em `dist-e2e/`, com a configuração do `.env.e2e` (commitado, sem nenhum segredo). Travas para esse build nunca ir ao ar: o deploy só publica `dist/`; o `VITE_MODE=e2e` vai na linha de comando do script, que vence qualquer `VITE_MODE` herdado do ambiente; e o app se recusa a abrir fora de `localhost`. Conferido no código compilado: o build de produção não tem nenhum resto do emulador nem da trava. Commits: `feat(e2e): modo e2e conectando auth e database ao emulador` e `fix(notificacoes): nunca enviar e-mail a partir do build de testes e2e`.

**Etapa 1: infraestrutura. Feita.** `@playwright/test` 1.63 instalado, com o `playwright.config.js` (um worker só, porque todos os testes usam o mesmo banco; `retries: 1` só no CI; trace, screenshot e vídeo guardados em falha) servindo `dist-e2e/` pelo `vite preview` na porta 4173. `npm run test:e2e` faz o build e roda o Playwright dentro de `firebase emulators:exec --only database,auth`. Todo teste importa `test` de `e2e/support/test.js`, que bloqueia tudo fora de `localhost` e reprova o teste se a página lançar erro de JavaScript não tratado. `e2e/support/emulator.js` zera e semeia o banco com `Bearer owner`; o app usa o namespace `plataformacodefolio-default-rtdb` (não o `plataformacodefolio` dos testes do Vitest), e as regras valem nele (visitante lendo `/users` recebe 401). Primeiros testes, em `e2e/visitante.spec.js`: o curso aparece em "Disponíveis" para o visitante, e o menu da página inicial leva ao catálogo. Conferido que o primeiro falha com o banco vazio.

O E2E já achou um bug: a página inicial monta a `Topbar` duas vezes (em `pages/dashboard/index.jsx` e dentro de `components/post/Post.jsx`), uma em cima da outra, cada uma com a sua busca. O teste clica na de cima, que é a que o usuário vê.

**Etapa 2: login e acesso. Feita.** Os testes logam por um atalho que só existe no build e2e: `e2e/support/auth.js` cria a conta (e-mail e senha) direto no emulador de Auth, e a página entra por `window.__codefolioE2E.signIn`. Essa conta só existe no emulador, que é recriado a cada execução, então não há credencial nenhuma a proteger (nem motivo para GitHub Secrets). Os 4 testes de `e2e/acesso.spec.js`: curso aberto entra direto; curso fechado recusa o PIN errado e libera com o certo; aluno já matriculado entra sem PIN; fechar o pedido de PIN volta ao catálogo. O fixture do curso fechado grava o `pinHash` com a mesma regra de `pin.js` (SHA-256 do PIN seguido do id do curso).

**O botão "Entrar com Google" não tem teste E2E**, por decisão de 29/09/2026: é fácil de conferir à mão e não precisa rodar a cada deploy. Tentar testá-lo mostrou por que não compensa: o SDK do Firebase carrega um script de `apis.google.com` para abrir o popup mesmo com o emulador, e a tela falsa do emulador carrega o Material Components do `unpkg.com`, então o teste dependeria de internet. Mesmo liberando os dois, o popup abria e preenchia, mas o resultado não voltava ao app (o emulador devolve pelo iframe que o SDK injeta na página, e a falha ficou sem diagnóstico). Com isso, o trecho de `handleGoogleSignIn` que cria `users/{uid}` no primeiro acesso também fica sem E2E.

Um tropeço desta etapa: o segundo commit da etapa 0 tinha feito o código do e2e (emulador e trava de localhost) voltar para o build de produção, sem rodar lá, mas presente. O Vite só apaga esse código enquanto consegue calcular o modo na hora do build, e deixou de conseguir quando `resolveRuntimeMode` passou a ser chamado de dois lugares. A regra do e-mail virou uma função própria, e o `npm run check:build` (`scripts/checkProductionBuild.mjs`) agora reprova o build de produção que tiver qualquer resto do e2e; o CI roda depois de cada build, inclusive no deploy.

**Etapa 3: vídeo e quiz. Feita.** `e2e/support/youtubeStub.js` troca o script `www.youtube.com/iframe_api` por um `YT.Player` mínimo (a rota da página vence o bloqueio de rede geral, que continua barrando o resto do YouTube). O player falso implementa só o que o `react-youtube` e o `VideoWatcher` usam, inclusive `getVideoData()`, com que o app confere se o evento é do vídeo atual; `watchVideo(page, { percent })` leva o vídeo ao ponto pedido e dispara a troca de estado, então o app mede na hora, sem esperar o ciclo de 5 s. Salvar o progresso, marcar assistido e destravar o próximo rodam de verdade.

Testes de `e2e/video.spec.js` (curso com dois vídeos, o segundo com `requiresPrevious`): 95% marca assistido, leva o curso a 50% e destrava o segundo; o destravamento sobrevive a recarregar a página; 50% salva o progresso e mantém o segundo bloqueado. Testes de `e2e/quiz.spec.js` (quiz no primeiro vídeo, 2 questões, nota mínima de 70%, 2 tentativas): aprovado vê "Pontuação: 2/2 (100.00%)" e destrava o seguinte; reprovado gasta uma tentativa e o seguinte segue bloqueado; sair antes de enviar não grava nada em `quizResults` e o aviso segue dizendo "já usou 0"; com as tentativas esgotadas, o clique em "Fazer Quiz" mostra o aviso de limite e o quiz não abre.

Uma inconsistência de tela que apareceu (não corrigida): para o aluno **aprovado** que gastou as tentativas, a lista mostra "Limite Atingido"; para o **reprovado** nas mesmas condições, continua mostrando "Fazer Quiz", e o limite só aparece como aviso depois do clique.

**Etapa 4: CI.** Hoje os segredos `VITE_*` estão no `env:` do workflow inteiro, e variável de ambiente vence o `.env.e2e`. Antes de criar o job, esse `env:` desce para os jobs `test` e `deploy`, para o `e2e` não receber segredo nenhum (e funcionar também em PR vindo de fork). Job `e2e` em `.github/workflows/ci-cd.yml`, paralelo ao `test`, com cache do navegador e upload do relatório em falha; `deploy` passa a ter `needs: [test, e2e]`. Commit: `ci: rodar testes e2e em PR e antes do deploy`.

**Etapa 5: prioridade 2.** Fluxos 6, 7 e 8, um commit por fluxo.

**Etapa 6 (opcional): smoke pós-deploy.** Job depois do `deploy`, só leitura, contra `https://plataformacodefolio.web.app`.

## Riscos

- **Testes instáveis (flaky).** É o maior risco de qualquer E2E. Mitigação: esperar por elementos na tela (o Playwright já faz isso) e nunca por tempo fixo, banco zerado por teste, nenhuma rede externa, e `retries: 1` só no CI. Se um teste falhar de forma intermitente, ele é corrigido ou sai, porque um teste que "às vezes falha" ensina todo mundo a ignorar o CI.
- **Stub do YouTube divergir da API real.** Se o YouTube mudar algo, o E2E não vai perceber. O smoke pós-deploy e o uso real cobrem essa parte.
- **Tempo do CI.** Se passar de uns 5 minutos, os testes são divididos em shards do Playwright.

## Decisões em aberto

1. O E2E deve **barrar o merge** do PR (check obrigatório na proteção da `main`) ou só avisar no começo, até os testes se mostrarem estáveis? Recomendação: só avisar nas primeiras semanas, depois tornar obrigatório.
2. Fazer o smoke pós-deploy (etapa 6)? Recomendação: sim, é barato e é a única verificação que olha a produção de verdade.
3. Só Chromium por enquanto? Recomendação: sim.
