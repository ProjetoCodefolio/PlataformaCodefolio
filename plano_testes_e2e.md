# Plano: testes de ponta a ponta (E2E) com Playwright

Status: **proposto, não implementado**. Escrito em 29/09/2026.

## Por que

Hoje o CI roda 910 testes (lint, build, unitários, fluxos no emulador e regras do banco), mas nenhum abre o site num navegador. Um botão que não responde, uma rota que renderiza em branco ou uma tela que quebra depois de mudar um hook passam direto se a lógica por trás estiver certa. Os testes E2E fecham essa lacuna: o Playwright abre o site de verdade, clica como o usuário e confere o que aparece na tela.

## Viabilidade

**É viável**, e a maior parte da infraestrutura já existe: o `firebase.json` já declara os emuladores de Database (9000), Auth (9099) e Hosting (5000), o CI já sobe o emulador com Java 21, e o repositório é público, então os minutos do GitHub Actions são gratuitos. Custo estimado por execução: uns 2 a 4 minutos a mais no CI (instalar o Chromium leva cerca de 1 minuto, com cache menos).

Há quatro obstáculos, todos contornáveis:

1. **Login só com Google (popup).** `src/api/services/auth.js` usa `signInWithPopup`, e `src/api/config/firebase.js` conecta só o Database ao emulador, deixando o Auth de fora de propósito (para o login local continuar sendo o Google real). Solução: um modo novo, `VITE_MODE=e2e`, que conecta **também** o Auth ao emulador. No emulador de Auth, o popup do Google vira uma tela falsa que o Playwright consegue preencher, e o Database emulator aceita os tokens emitidos por ele, então as regras de segurança (`auth.uid`) valem de verdade. O modo de desenvolvimento local continua como está.
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
2. **Login**: o aluno entra pelo botão "Entrar com Google" (tela falsa do emulador), cai no `/dashboard` e o registro em `users/{uid}` é criado.
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

**Etapa 0: modo E2E no app.** Em `src/api/config/firebase.js`, aceitar `VITE_MODE=e2e`: liga os emuladores mesmo em `vite build` (hoje o `import.meta.env.DEV` é falso no build) e chama `connectAuthEmulator`. Testar contra o build, e não contra o dev server, deixa o teste mais perto do que vai para produção. Commit: `feat(e2e): modo e2e conectando auth e database ao emulador`.

**Etapa 1: infraestrutura.** Instalar `@playwright/test`, criar `playwright.config.js` (servidor `vite preview` do build E2E, `baseURL`, bloqueio de rede externa, trace em falha), os helpers de `e2e/support/` e o script `npm run test:e2e` rodando dentro de `firebase emulators:exec`. Primeiro teste: o fluxo 1 (visitante). Commit: `test(e2e): infraestrutura do playwright com emulador`.

**Etapa 2: login e acesso.** Fluxos 2 e 3. Aqui se valida que as regras do banco aceitam o token do Auth emulator. Commit: `test(e2e): login e acesso ao curso`.

**Etapa 3: vídeo e quiz.** Stub do YouTube e fluxos 4 e 5. É a etapa de maior risco (o stub precisa imitar o suficiente da API do `YT.Player`). Commit: `test(e2e): progresso de video e quiz`.

**Etapa 4: CI.** Job `e2e` em `.github/workflows/ci-cd.yml`, paralelo ao `test`, com cache do navegador e upload do relatório em falha; `deploy` passa a ter `needs: [test, e2e]`. Commit: `ci: rodar testes e2e em PR e antes do deploy`.

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
