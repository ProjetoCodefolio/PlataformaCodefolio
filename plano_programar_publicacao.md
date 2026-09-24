# Plano: programar publicação de conteúdo, material e quiz

Status: **não implementado**. Escrito em 24/09/2026.

## Por que

Pedido do Silvio (17/09/2026): hoje ele importa os vídeos semana a semana para parecer que cada semana tem aula nova. Ele quer planejar o semestre inteiro de uma vez e deixar cada item aparecer sozinho na data escolhida. A exigência central é que, antes da data, o aluno **não veja o item de jeito nenhum**: nada de "Programado" ou "Em breve" do lado do aluno. Notificação na data é desejável, mas ele aceita ficar sem ela, desde que programar não dispare aviso na hora.

Escopo combinado com o Matheus (24/09/2026):

- campo "Programar publicação" na inserção manual;
- na importação, poder definir um intervalo de postagem que pré-preenche a data de cada item, com o professor revisando cada data (ou digitando na mão) antes de confirmar;
- o professor pode editar a publicação de qualquer item depois: vídeo/slide, material e quiz.

## Ideia central

Um campo `publishAt` opcional em cada item, e **uma única função** que decide se o item está publicado. Toda tela ou agregação do lado do aluno passa por ela, e ninguém compara data na mão.

Convenção do dado, igual à janela do quiz (`openDate`/`closeDate`): string ISO em UTC; ausente, `""` ou `null` significa "publicado". Limpar a data grava `null` via `update()`.

Vale lembrar que a ocultação é **só de interface**: `courseContent`, `courseVideos`, `courseSlides`, `courseMaterials` e `courseQuizzes` têm `.read: true` (`database.rules.json:82-130`), então quem consultar o banco na mão vê o item programado. É o mesmo nível de garantia do anonimato das perguntas, e atende o pedido ("que não aparecesse", não "que fosse secreto"). Esconder no banco exigiria mudar a leitura desses nós inteiros, que hoje é feita em massa no nó do curso, e isso ficou fora deste plano.

## 0. Base: módulo de publicação

Módulo novo `src/api/services/courses/publication.js`, puro e testável:

- `normalizePublishAt(value)`: devolve ISO ou `""` (mesma regra de `normalizeQuizDate` em `quizWindow.js:41`);
- `isPublished(item, now = serverNow())`: `true` se não tem `publishAt` ou se `publishAt <= now`;
- `effectiveQuizPublishAt(quiz, content)`: o quiz só aparece quando ele **e** o conteúdo ao qual está preso estiverem publicados, então a data efetiva é a maior das duas;
- `buildPublicationSchedule(items, { start, intervalDays, perSlot })`: usado pela importação (seção 4); devolve `{ [itemId]: iso }` respeitando a ordem recebida.

**Relógio:** usar o relógio do servidor, não o do aluno. `serverNow()` lê uma vez `.info/serverTimeOffset` do Firebase e soma a `Date.now()`. Custa uma leitura por sessão e impede que adiantar o relógio do computador libere o vídeo antes da hora. Cair para `Date.now()` se a leitura falhar.

**Campo de data:** hoje `isoToLocalInput`/`localInputToIso` estão duplicados em `QuizScheduleSettings.jsx:8-22` e `AssignmentForm.jsx:64`. Extrair para `src/app/utils/dateInput.js` e fazer os três usarem dali. Criar um componente `PublishAtField.jsx` (`TextField type="datetime-local"` do MUI, mesmo padrão do quiz) com texto de ajuda "Deixe vazio para publicar agora" e um botão "Publicar agora" que limpa o campo.

## 1. Deixar o campo passar por quem lê e grava

Vários pontos montam um objeto com lista fixa de campos, ou gravam com `set()`. Sem estes ajustes, o `publishAt` some no caminho, e é aqui que mora o risco de bug silencioso.

Leitores que descartam campos desconhecidos (incluir `publishAt`):

- `fetchCourseContentItems` (`content.js:96-104`);
- `buildContentPayload` (`content.js:51-63`);
- `readSource` (`contentOrder.js:48-70`), que alimenta a lista do professor;
- `normalizarItem` (`contentImport.js:52-67`);
- `fetchCourseMaterials` (`extraMaterials.js:24-29`);
- mapa `fullById` de `loadContent` (`CourseContentTab.jsx:285-311`).

Escritores:

- `updateCourseVideo` (`videos.js:214`) e `updateCourseSlide` (`slides.js:119`) montam payload fixo: incluir `publishAt`;
- `updateCourseMaterial` (`extraMaterials.js:93`) e `saveAllCourseMaterials` (`extraMaterials.js:166/173`) usam `set()`. O `saveAllCourseMaterials` roda a cada "Salvar Curso" (`useCourseSubmit.js:84`), então **apagaria a data de todos os materiais** se o payload não trouxer o campo;
- quiz: o nó do quiz é sobrescrito por `set()` em vários pontos (`quizQuestions.js`, `saveAllCourseQuizzes`, `saveQuiz`, `addQuiz`, `buildImportedQuiz`). O `publishAt` do quiz **tem que entrar em `persistableQuizSettings`** (`quizWindow.js:53-62`), senão a próxima edição de questão apaga a data. Ver memória "Quiz node set-rewrite".

Testes: estender os testes existentes dessas funções (`contentImport.test.js`, `extraMaterialsImport.test.js`, testes de `quizWindow`) com "o `publishAt` sobrevive a ler, editar e salvar".

## 2. Filtrar do lado do aluno

A regra é filtrar **na origem**, antes de montar a lista, porque navegação, cadeado sequencial e progresso são todos por índice no array recebido. Filtrando na origem, anterior/próximo, `isVideoLocked` e o `?videoId=` passam a funcionar sem mexer neles.

Página do curso (`/classes`):

- `useCourseContent.js`: filtrar o resultado de cada fonte (`loadCourseData` :67, `loadCourseContentForStudent` :90, `loadCourseSlides` :97) antes do merge de :147-159. Há um **segundo** `loadCourseSlides` em :312-342, que alimenta `useSlideNavigation`, e ele também precisa do filtro;
- quiz de item publicado mas com quiz ainda programado: zerar `quizId` desse item. Isso esconde o botão e também tira o quiz da exigência de conclusão (`isContentCompleted`, `students.js:12`, exige `quizPassed` sempre que existe `quizId`);
- link direto: `useCourseContent.js:202-221` já cai no primeiro item não concluído quando o `videoId` não está na lista, então link de notificação antiga para item programado não abre nada;
- vídeos de sala invertida (`submissions.js:300-349`) não têm `publishAt` e continuam sempre visíveis;
- materiais: `extraMaterials/index.jsx:26`.

Visão do professor na página do aluno: dono, co-professor e admin (`canRunCourse`, `permissions.js:55`) veem os itens programados na lista, com um selo "Programado para dd/mm". Serve para ele conferir o semestre sem precisar de conta de aluno. **Decisão pendente**, ver seção 7.

## 3. Progresso, presença e notas

Esta é a parte que mais pode dar errado, porque um item oculto contando no denominador derruba o número da turma inteira.

- **Progresso** (`updateCourseProgress`, `students.js:80-109`): não lê o banco, só conta o array recebido. Com o filtro da seção 2 ele já fica certo. `classes.js:236-268` (`checkCourseCompletion`) usa o mesmo array;
- **Presença** (`attendanceData.js:17-22`, cálculo em `attendance.js:91-135`): tirar os vídeos não publicados de `totalVideos` e `maxPresences`, senão a presença de todo mundo cai no começo do semestre;
- **Notas de quiz** (`quizAggregation.js:294-437`): tirar do `averageGrade` e do `completionRate` os quizzes cuja data efetiva ainda não chegou, senão eles contam como zero ou como não feitos;
- **Catálogo de visitante** (`courses.js:176-201`): contar só publicados em `totalVideos`;
- **Scripts de auditoria** (`progressAudit.js:135`, usado por `scripts/auditCourseProgress.mjs` e `scripts/recoverCourseProgress.mjs`): usar `isPublished`, senão eles "corrigem" o progresso de volta para o denominador cheio;
- `recalcCourseProgressFromWatched` (`students.js:117`) só é chamado por `addCourseVideo`, que não tem chamador na interface. Deixar como está e anotar.

Efeito colateral a aceitar: quando um vídeo novo é publicado, quem estava com 100% volta para algo como 90% e `in_progress`. Para liberação semanal isso é o comportamento certo (o aluno fez tudo o que existia até ali), mas muda o que o professor vê em `CourseStudentsTab.jsx:835`. `persistProgress` já protege disciplina encerrada. **Decisão pendente**, ver seção 7.

## 4. Telas do professor

### 4.1 Inserção e edição manual de vídeo/slide (`CourseContentTab.jsx`)

- `emptyForm` (:219-225) ganha `publishAt: ""`; `handleEdit` (:404-419) pré-preenche; `PublishAtField` entra no formulário;
- validação em `handleSubmit` (:355-402): data no passado é aceita e significa "publicar agora" (o campo é gravado como `null`, para não deixar lixo);
- criação: `notifyNewContent` (:392) **só dispara se o item nasce publicado**. Essa é a condição explícita do Silvio;
- edição que tira a data de um item programado (publicar agora): não notifica nesta etapa (ver seção 6);
- lista (`SortableContentItem`, :82-217): selo "Programado · dd/mm HH:mm" ao lado dos chips de :154-200, no mesmo estilo do chip "Abre em" do `QuizList.jsx:31-52`. A ordem de arrastar não muda: item programado ocupa a posição dele normalmente.

### 4.2 Materiais (`CourseMaterialsTab.jsx`)

- estado novo `materialPublishAt` ao lado de `materialName`/`materialUrl` (:24-32); `handleAddMaterial` (:53), `handleEditMaterial` (:77) e `handleUpdateMaterial` (:89) passam o campo;
- selo "Programado" na lista (:265-330);
- materiais não notificam hoje, então não há aviso para cortar.

### 4.3 Quiz

O quiz já tem `openDate`, e ele **não esconde**: antes da abertura o aluno vê o botão "Quiz Agendado" e o chip "Quiz abre em..." (`videoList/index.jsx:220-229, 553-588`). Por isso a publicação vira um campo novo, com papel diferente:

- `publishAt`: até essa data o quiz não existe para o aluno;
- `openDate`/`closeDate`: janela em que dá para responder, já visível.

Para o professor não precisar entender dois conceitos, o `QuizScheduleSettings.jsx` ganha o campo "Publicar em" acima de "Abre em"/"Fecha em", com uma explicação curta, e duas regras:

- se `openDate` for anterior à publicação efetiva, avisar ("o quiz só aparece em dd/mm") sem bloquear;
- a publicação efetiva mostrada é `effectiveQuizPublishAt`, ou seja, se o vídeo sai em 10/03 e o quiz está com 05/03, a tela mostra que ele aparece em 10/03.

Pontos de gravação: `useQuizCreationForm.js` (:30-35, :66, :126), `QuizSettingsModal.jsx` (`handleBlurSchedule` :167 via `updateQuizSchedule`, que já grava `null` para limpar) e `persistableQuizSettings`. `notifyNewQuiz` (criação em `useQuizCreationForm.js:79/139`, edição em `QuizSettingsModal.jsx:214`): não disparar se a publicação efetiva estiver no futuro, e desabilitar o "avisar a turma" com a explicação.

## 5. Importação com intervalo de postagem

Um componente compartilhado `PublicationScheduler.jsx`, usado nas importações de conteúdo e de materiais:

- caixa "Programar publicação" desligada por padrão (importação sem data continua como hoje);
- ligada, mostra: **primeira publicação** (data e hora), **intervalo** em dias (padrão 7) e **itens por vez** (padrão 1, para quem posta vídeo + slide juntos);
- botão "Aplicar aos selecionados", que chama `buildPublicationSchedule` na **ordem da origem** (a mesma que `importContentFromCourse` já respeita) e preenche um `PublishAtField` em cada linha selecionada;
- o professor pode editar a data de qualquer linha depois de aplicar, ou ignorar o intervalo e digitar tudo na mão. Mudar o intervalo e aplicar de novo sobrescreve, por isso a confirmação pede ok se alguma data tiver sido editada à mão;
- marcar ou desmarcar um item depois de aplicar não recalcula as outras datas sozinho (seria surpresa). Aparece um aviso "seleção mudou, aplicar de novo?".

### 5.1 Conteúdo (`ImportContentModal.jsx` + `contentImport.js`)

- estado novo `publishAtById` ao lado de `selectedIds`/`comQuizIds` (:51-56); o campo de data entra na linha, no mesmo lugar do "Trazer o questionário junto" (:231-311);
- `selections` passa a ser `{ contentId, withQuiz, publishAt }`, e `importContentFromCourse` (:128-222) grava `publishAt` no objeto `novo` (:180-187), no mesmo `update` único;
- o quiz importado junto **herda a data do conteúdo** e não ganha campo próprio (a data efetiva já cuida disso). Se o professor quiser o quiz depois do vídeo, ajusta no quiz;
- a importação não notifica, e continua não notificando.

### 5.2 Materiais (`ImportMaterialsModal.jsx` + `importMaterialsFromCourse`)

- mesmo `PublicationScheduler`, estado `publishAtById`;
- `importMaterialsFromCourse(src, courseId, selectedIds)` (`extraMaterials.js:198-245`) muda de assinatura para receber `{ materialId, publishAt }`, e a cópia passa a gravar `publishAt` além de `name`/`url`.

### 5.3 Quiz avulso (`ImportQuizModal.jsx`)

É de um em um (cada quiz precisa de um vídeo de destino), então não faz sentido intervalo. Entra só um `PublishAtField` opcional, gravado por `importQuizFromCourse` (`quizImport.js:144-183`). O texto de :219-221 ("a janela de datas nunca vem junto") continua valendo para `openDate`/`closeDate`.

## 6. Notificação na data (etapa 2, fora desta entrega)

Esta entrega só garante que **programar não avisa ninguém**. Avisar na data exige algo que roda sem ninguém logado, e o app não tem backend. Esboço para um plano próprio:

- **in-app:** ao programar, gravar a notificação já na caixa de cada aluno com id fixo (`sched_{courseId}_{itemId}`) e um campo `visibleAt`; o sino (`NotificationBell.jsx:49-53`) filtra por `visibleAt <= agora` na lista e no contador. Mudar a data ou apagar o item atualiza ou apaga por esse id. Obstáculo: a regra de `notifications/$userId/$notificationId` (`database.rules.json:58-70`) só deixa o dono do curso **criar** (`!data.exists()`), não atualizar nem apagar. Precisa de mudança de regra, testada no emulador, e continua sem cobrir co-professor (gap já conhecido);
- **e-mail:** o Worker do Cloudflare (`emailWorker/`) já valida token do Firebase e pode ganhar um gatilho `scheduled` no `wrangler.toml`: o cliente manda o e-mail com `sendAt`, o Worker guarda no KV e o cron de hora em hora enfileira os que venceram.

## 7. Decisões pendentes

1. **Professor vendo itens programados na página do curso.** Recomendação: sim, com selo, só para `canRunCourse`.
2. **Progresso que volta de 100% quando sai item novo.** Recomendação: aceitar, porque é o que faz sentido para liberação semanal. A alternativa (contar item programado no denominador) deixaria a turma com progresso baixo o semestre todo.
3. **Ação em lote na aba de conteúdo** ("reprogramar selecionados" para itens já cadastrados). Fica para depois: o pedido cobre inserção, importação e edição item a item. O `PublicationScheduler` fica pronto para ser reaproveitado ali.

## 8. Testes

- `publication.test.js`: `isPublished` (sem data, passado, futuro, `""`, `null`, data inválida), `effectiveQuizPublishAt`, `buildPublicationSchedule` (ordem, intervalo, itens por vez, hora local preservada entre semanas);
- persistência: `publishAt` sobrevive a `persistableQuizSettings`, a edição de questão, a `saveAllCourseMaterials` e a `updateCourseVideo`/`updateCourseSlide`;
- `contentImport.test.js` e `extraMaterialsImport.test.js`: data gravada por item, quiz sem data própria;
- `attendance.test.js` e `quizAggregation.test.js`: item programado fora do denominador;
- `quizGate.test.js`: item com quiz programado não tem `quizId`;
- emulador (`content.emulator`, `contentImport.emulator`, `courseFlow.emulator`): criar programado, ler como aluno, avançar o relógio e ler de novo;
- `notifyNewContent`/`notifyNewQuiz`: não disparam com data futura.

## 9. Ordem dos commits

Commits atômicos, em português, conventional commits:

1. `refactor(datas): extrair conversao de datetime-local para util compartilhado`
2. `feat(publicacao): modulo de publicacao programada com relogio do servidor`
3. `fix(conteudo): preservar campos extras na leitura e gravacao de conteudo e materiais` (seção 1, antes de qualquer tela gravar o campo)
4. `feat(conteudo): programar publicacao de video e slide no formulario`
5. `feat(aluno): ocultar conteudo nao publicado na pagina do curso`
6. `fix(relatorios): ignorar conteudo nao publicado em presenca, notas e auditoria`
7. `feat(materiais): programar publicacao de material`
8. `feat(quiz): programar publicacao do quiz`
9. `feat(importacao): programar publicacao em serie na importacao de conteudo e materiais`
10. `feat(importacao): data de publicacao na importacao de quiz avulso`

Os commits 3, 5 e 6 precisam sair juntos no mesmo deploy que o 4: um item programado gravado sem o filtro do aluno aparece para a turma.
