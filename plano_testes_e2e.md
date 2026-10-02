# Plano: testes de ponta a ponta (E2E) com Playwright

Status: **etapas 0 a 4 implementadas em 29/09/2026 e etapa 5 em 02/10/2026** na branch `test/e2e-playwright`; etapa 6 pendente. Decisões em aberto resolvidas em 02/10/2026 (ver o fim do documento). Escrito em 29/09/2026.

## Por que

Hoje o CI roda 910 testes (lint, build, unitários, fluxos no emulador e regras do banco), mas nenhum abre o site num navegador. Um botão que não responde, uma rota que renderiza em branco ou uma tela que quebra depois de mudar um hook passam direto se a lógica por trás estiver certa. Os testes E2E fecham essa lacuna: o Playwright abre o site de verdade, clica como o usuário e confere o que aparece na tela.

## Viabilidade

**É viável**, e a maior parte da infraestrutura já existe: o `firebase.json` já declara os emuladores de Database (9000), Auth (9099) e Hosting (5000), o CI já sobe o emulador com Java 21, e o repositório é público, então os minutos do GitHub Actions são gratuitos. Custo estimado por execução: uns 2 a 4 minutos a mais no CI (instalar o Chromium leva cerca de 1 minuto, com cache menos).

Há quatro obstáculos, todos contornáveis:

1. **Login só com Google (popup).** `src/api/services/auth.js` usa `signInWithPopup`, e `src/api/config/firebase.js` conectava só o Database ao emulador, deixando o Auth de fora de propósito (para o login local continuar sendo o Google real). Solução: o modo `VITE_MODE=e2e` conecta **também** o Auth ao emulador, que aceita os tokens emitidos por ele no Database emulator, então as regras de segurança (`auth.uid`) valem de verdade. O modo local continua como está. O popup em si ficou **fora do E2E** (ver etapa 2): o teste loga por um atalho, sem popup.
2. **Dados.** Cada teste precisa de um banco conhecido (curso, vídeos, quiz, usuários com papel `admin`/professor/aluno). Solução: fixtures em JSON gravadas direto no emulador via REST com `Authorization: Bearer owner` (o mesmo truque que `src/app/dev/localPublicationCron.js` já usa), e banco zerado entre os testes.
3. **Player do YouTube.** O progresso depende de `player.getCurrentTime()` da API do YouTube (`react-youtube`, em `VideoPlayer.jsx`), que carrega um iframe externo: lento, instável e sem controle do tempo. Solução: o Playwright intercepta `youtube.com/iframe_api` com `page.route` e serve um stub mínimo do `YT.Player` que deixa o teste dizer "o vídeo está em 95%". O resto do caminho (hooks de progresso, gravação no banco, cadeado sequencial) roda de verdade.
4. **Serviços externos.** Groq (gerador de quiz), Worker de e-mail e Analytics não podem ser chamados. Analytics e e-mail já ficam desligados fora do build de produção. Por garantia, o Playwright bloqueia qualquer requisição que não seja `localhost` (exceto as fontes do Google Fonts, se necessário).

~~Um ponto a favor: `publication.js` calcula a hora como `Date.now()` + `.info/serverTimeOffset`, então `page.clock` do Playwright consegue avançar o relógio e testar a publicação programada sem esperar.~~ Errado, visto na etapa 5: o offset existe justamente para anular o relógio do navegador (o aluno não libera o item adiantando o relógio do computador), e por isso também anula o `page.clock`. O teste usa uma data poucos segundos à frente.

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

6. **Publicação programada**: o professor programa um vídeo pelo formulário; o aluno não vê o vídeo; quando a data chega, o vídeo aparece (com data real poucos segundos à frente, não `page.clock`; ver Viabilidade).
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

**Etapa 4: CI. Feita.** Os segredos `VITE_*` saíram do `env:` do workflow inteiro (lá eles chegavam ao job de E2E e venciam o `.env.e2e`) e desceram para os jobs `test` e `deploy`; o `e2e` não recebe segredo nenhum e roda também em PR vindo de fork. O job `e2e` em `.github/workflows/ci-cd.yml` roda em paralelo ao `test`: instala só o Chromium (`npx playwright install --with-deps chromium`), roda `npm run test:e2e` e, em falha, guarda `playwright-report/` e `test-results/` (trace, screenshot e vídeo) por 7 dias. O `deploy` passou a ter `needs: [test, e2e]`. Ficou sem cache do navegador por enquanto: só entra se o tempo do job incomodar. **Ainda não rodou no GitHub**, porque o workflow só dispara em PR para a `main` ou push nela; a primeira execução de verdade é a do PR desta branch. Commit: `ci: rodar os testes e2e em PR e antes do deploy`.

**Etapa 5: prioridade 2. Feita em 02/10/2026.** Um commit por fluxo; a suíte ficou com 20 testes (cerca de 50 s). Cada teste novo foi conferido quebrando de propósito o código que ele protege (e voltando o código depois): todos reprovaram.

- Fluxo 6, `e2e/publicacao.spec.js`: com o segundo vídeo programado para 8 s à frente, o aluno não o vê e ele aparece ao recarregar depois da data; o professor programa pelo formulário de edição (o banco recebe a data em UTC), vê o vídeo na sala com o selo "Programado", e o aluno não vê nem o vídeo nem o selo. A ocultação tem duas camadas no `useCourseContent` (a lista montada e o `visibleVideos`), e o teste só reprova quando as duas falham; quem ele protege de fato é o `toStudentView`. `e2e/fixtures/teacher.js` (`asTeacher`) troca a professora fixa dos cenários por uma conta de verdade, dona do curso.
- Fluxo 7, `e2e/quiz-professor.spec.js`: adicionar uma questão mantém as duas que já existiam iguais, gera id novo e mantém nota mínima e tentativas; editar a segunda questão na própria lista (salvamento automático) muda só ela, pelo id, e sobrevive a recarregar a página. Reprova tanto se a gravação perder a configuração do quiz (`persistableQuizSettings`) quanto se a edição valer para todas as questões. Para achar os botões pelo nome, os dois botões só de ícone do card do quiz ganharam rótulo ("Ver questões", com `aria-expanded`, e "Excluir quiz"), em commit próprio.
- Fluxo 8, `e2e/admin.spec.js`: o admin abre `/admin-panel` e `/adm-cursos`; a professora abre `/adm-cursos` e vai para o `/dashboard` no painel de administração; o aluno vai para o `/dashboard` nas duas.

**Etapa 6: smoke pós-deploy.** Decidido fazer (ver o fim do documento). Job depois do `deploy`, só leitura, contra `https://plataformacodefolio.web.app`.

## Riscos

- **Testes instáveis (flaky).** É o maior risco de qualquer E2E. Mitigação: esperar por elementos na tela (o Playwright já faz isso) e nunca por tempo fixo, banco zerado por teste, nenhuma rede externa, e `retries: 1` só no CI. Se um teste falhar de forma intermitente, ele é corrigido ou sai, porque um teste que "às vezes falha" ensina todo mundo a ignorar o CI.
- **Stub do YouTube divergir da API real.** Se o YouTube mudar algo, o E2E não vai perceber. O smoke pós-deploy e o uso real cobrem essa parte.
- **Tempo do CI.** Se passar de uns 5 minutos, os testes são divididos em shards do Playwright.

## Decisões (resolvidas em 02/10/2026)

1. O E2E **barra o merge**: vira check obrigatório na proteção da `main`, desde já (a recomendação era só avisar nas primeiras semanas). Falta configurar na proteção da branch, no GitHub, depois que o job rodar pela primeira vez (o check só aparece na lista depois de uma execução).
2. O smoke pós-deploy (etapa 6) **entra**.
3. **Só Chromium**.
