# Plano: notificar na hora da publicação programada

Status: **parcial (24/09/2026)**. Feitos os commits 1, 2 e 4 da seção 8 (texto compartilhado, fila e cron), testados no emulador e com `wrangler dev`. Faltam a conta de serviço (seção 3, sem ela o cron de produção não roda), o script de preenchimento (seção 5) e o wizard. Escrito em 24/09/2026. Continua o `plano_programar_publicacao.md` (substitui o esboço da seção 6 dele).

## Por que

Com a publicação programada, o item aparece para a turma na data, mas ninguém é avisado: o aviso só existe no momento do cadastro, e o cadastro de um item programado não avisa (de propósito, para não revelar o que vem depois). Resultado: o vídeo das 19h35 apareceu e a turma não soube.

Regra combinada com o Matheus (24/09/2026): **na hora da publicação, a turma é avisada exatamente como se o professor tivesse cadastrado o item naquele momento.** Nada a mais, nada a menos:

| Item | Cadastro na hora (hoje) | Publicação programada (este plano) |
|---|---|---|
| Vídeo / slide | sino (`newContent`) | sino (`newContent`) |
| Quiz | sino + e-mail (`newQuiz`) | sino + e-mail (`newQuiz`) |
| Material | nada | nada |

Mesmos destinatários (matriculados que não são professores da turma), mesmas preferências por curso, mesmo texto, mesmo link, mesma fila de e-mail com a cota do Brevo.

## Por que precisa de servidor

O e-mail do quiz tem que sair na hora, com a turma fora da plataforma: é para isso que ele existe. Nada do lado do cliente resolve isso, porque às 19h35 pode não haver ninguém com o app aberto. A entrega "quando o aluno abrir o app" serviria para o sino, mas não para o e-mail, e dois caminhos diferentes para o mesmo aviso é justamente o que a regra acima quer evitar.

A única peça de servidor que existe é o Worker do Cloudflare (`emailWorker/`). Ele ganha um gatilho `scheduled` (cron) e passa a fazer as duas coisas na hora: gravar o sino e enfileirar o e-mail.

## 1. Fila de publicações (`publicationQueue`)

Varrer todo `courseContent`/`courseQuizzes` a cada execução não escala. O cliente mantém um índice pequeno, só do que está programado:

```
publicationQueue/{courseId}__{kind}__{itemKey}
  courseId, kind: "content" | "quiz", itemKey, source: "content" | "video" | "slide",
  publishAt   (ISO, com .indexOn para a consulta por data)
```

- `itemKey` é a chave do item no nó dele: id do conteúdo, ou a chave do quiz (`slide_<id>` no slide legado).
- Um conteúdo programado com quiz gera **duas** entradas: a do conteúdo na data dele e a do quiz na data **efetiva** (`effectiveQuizPublishAt`).
- Quem mantém: uma função única no cliente, `syncPublicationQueue(courseId, ...)`, chamada em todo ponto que grava `publishAt` (formulário de conteúdo, materiais não entram, quiz em `updateQuizSchedule`/`updateQuizPublishAt`/`addQuiz`, as duas importações) e na exclusão de conteúdo e de quiz. Data vazia ou passada remove a entrada.
- Regra do banco: escrita para dono, admin e professor da turma (mesma condição de `courseContent`); leitura só admin. O Worker lê com conta de serviço, que passa por cima das regras.

## 2. O cron do Worker

`wrangler.toml` ganha `[triggers] crons = ["*/5 * * * *"]` (de 5 em 5 minutos: o aviso chega até 5 minutos depois da hora marcada). A cada execução:

1. Consulta `publicationQueue` com `orderBy="publishAt"&endAt=<agora>`.
2. Para cada entrada vencida, **relê o item de verdade** (a fila é só um índice; a fonte da verdade continua sendo o item):
   - item não existe mais: apaga a entrada e segue;
   - data efetiva do item ainda no futuro (o professor adiou e a fila ficou para trás): atualiza a entrada para a nova data e segue;
   - publicado: notifica (passo 3) e apaga a entrada.
3. Notificação, espelhando `notifyNewContent`/`notifyNewQuiz`:
   - lê `studentCourses`, `users` e `notificationPrefs` do curso, filtra quem não é professor da turma e quem aceita o tipo;
   - grava em `notifications/{uid}/{push}` o mesmo objeto que o cliente grava hoje (`type`, `title`, `message`, `link`, `read: false`, `createdAt` = hora do envio);
   - quiz: enfileira na `EMAIL_QUEUE` o mesmo job que `enqueueNotificationEmail` manda hoje, com `type: "new_quiz"`.
4. **Não duplicar:** antes de notificar, a entrada é "reservada" com escrita condicional (ETag do REST do RTDB): só quem conseguir trocar a entrada por um carimbo `sendingAt` envia. Duas execuções sobrepostas não mandam dois avisos.

## 3. Acesso do Worker ao banco

Hoje o Worker só valida token. Para gravar notificações ele precisa de credencial própria:

- **Conta de serviço** do Firebase com acesso ao Realtime Database; a chave JSON vira o secret `FIREBASE_SERVICE_ACCOUNT` (`wrangler secret put`). O Worker assina um JWT com `jose` (já é dependência) e troca por um access token do Google, que vai no REST do RTDB (`?access_token=`). O token é guardado no KV até expirar.
- `FIREBASE_DATABASE_URL` em `[vars]`, para poder apontar para o emulador no teste local (`wrangler dev --test-scheduled` + emulador aceitando `Authorization: Bearer owner`).
- Criar a conta de serviço é passo manual no console do Firebase: vale um wizard (`/wizard`) no mesmo estilo do `setup-wizard.sh` que já existe.

## 4. Um texto só para os dois caminhos

Hoje o texto do aviso e os campos do e-mail do quiz são montados no cliente (`notifications.js`: título, mensagem, `quizWindowSummary`, `quizEmailFields`, `contentLink`). Se o Worker tiver uma cópia, os dois textos vão divergir com o tempo. Extrair essas funções para um módulo **puro**, sem Firebase, importado pelos dois (o esbuild do wrangler resolve import relativo para `../src/...`).

Cuidado com fuso: o cliente formata datas no fuso do navegador; o Worker roda em UTC. O módulo compartilhado recebe o fuso por parâmetro, e o Worker passa `America/Sao_Paulo`.

## 5. Itens já programados antes disso

O que já foi programado (os 10 vídeos de Figma no emulador, por exemplo) não está na fila. Um script `scripts/backfillPublicationQueue.mjs` varre `courseContent`, `courseVideos`, `courseSlides` e `courseQuizzes` uma vez e cria as entradas do que está no futuro. Idempotente: rodar duas vezes não duplica.

## 6. O que fica igual

- Cadastro de item programado continua sem avisar; cadastro de item publicado continua avisando na hora, pelo cliente, como hoje.
- "Avisar a turma" na edição do quiz continua bloqueado enquanto o quiz estiver oculto.
- Material continua sem aviso.
- A trava de e-mail fora de produção muda de lugar: no cron não existe `import.meta.env.PROD`. O Worker de produção só lê o banco de produção, e o `wrangler dev` local aponta para o emulador; a allowlist de teste (`VITE_EMAIL_TEST_ALLOWLIST`) ganha um equivalente no Worker (`EMAIL_TEST_ALLOWLIST` em `[vars]` do ambiente de dev).

## 7. Testes

- Módulo compartilhado de texto: testes puros (mesma mensagem para cliente e Worker, fuso fixo).
- `syncPublicationQueue`: emulador, cobrindo criar, adiar, antecipar, limpar a data, excluir o item, conteúdo com quiz (duas entradas) e importação.
- Cron: função `processDuePublications(db, now)` separada do handler, testada contra o emulador com um `db` fino sobre o REST: vencido notifica uma vez, adiado é reagendado, excluído é descartado, reserva impede envio duplo, preferência desligada é respeitada, professor da turma não recebe.
- Regra da `publicationQueue`: teste de regras no emulador (aluno não lê nem escreve).

## 8. Ordem dos commits

1. `refactor(notificacoes): extrair texto das notificacoes para modulo puro compartilhado`
2. `feat(publicacao): fila de publicacoes programadas mantida pelo cliente` (+ regra e `.indexOn`)
3. `feat(worker): acesso ao banco com conta de servico`
4. `feat(worker): notificar publicacoes programadas no cron`
5. `feat(scripts): preencher a fila com o que ja estava programado`
6. wizard da conta de serviço

## 9. Decisões pendentes

1. **Intervalo do cron.** Recomendo 5 minutos: aviso com até 5 minutos de atraso, e a execução sem nada vencido custa uma consulta pequena.
2. **Conta de serviço.** Precisa ser criada por alguém com acesso de dono ao projeto Firebase (`plataformacodefolio`).
