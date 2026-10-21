# Plano: saída do curso e remoção da turma

Status: **implementado em 21/10/2026** na branch `feat/saida-do-curso` (etapas 0 a 9). Escrito em 20/10/2026 na branch `feat/saida-do-curso`, a partir de uma rodada de perguntas (`/grill-with-docs`) com o Matheus. Os termos estão no `CONTEXT.md` (seções Matrícula e Autoridade sobre o curso) e a decisão de fundo está em `docs/adr/0001-matricula-encerrada-em-vez-de-apagada.md`.

## Por que

Foi pedido um botão para o aluno sair de um curso. A remoção de aluno pelo professor já existia, comentada em `CourseStudentsTab.jsx` com um "TODO testar", e as duas coisas são a mesma operação de fundo: o encerramento da matrícula. A função que a remoção chamaria (`unenrollStudentFromCourse`) apaga em cascata todo o histórico do aluno no curso, e nem funcionaria: o aluno não lê os nós de resultado que ela varre, e o professor da turma não pode apagar `videoProgress` nem `quizResults`, então a escrita atômica cairia inteira.

## Decisões

1. **Nada é apagado.** Saída (pelo aluno) e remoção (por quem conduz o curso) passam a matrícula para **encerrada**. Progresso, resultados de quiz, dúvidas e entregas ficam. Quem volta reativa a mesma matrícula e continua de onde parou, inclusive com as tentativas de quiz já gastas (senão sair e voltar zeraria tentativas).
2. **Forma do dado.** Três campos novos em `studentCourses/{uid}/{courseId}`: `endedAt` (ISO), `endedBy` (uid de quem encerrou) e `endReason` (`"left"` ou `"removed"`). Matrícula ativa é a que não tem `endedAt`. O `status` (`in_progress`/`completed`) não é tocado, porque continua sendo o retrato do progresso e é o que `closeDiscipline` usa. Reativar limpa os três campos.
3. **Disciplina encerrada congela a turma.** Não há saída, remoção, readmissão nem reativação até a disciplina ser reaberta. O botão aparece desabilitado com o motivo.
4. **Curso auto-ritmado concluído pode ser deixado**, porque a conclusão é recalculada a partir do histórico.
5. **Professor da turma** pode sair: perde o papel (`users/{uid}/coursesTeacher/{courseId}`) na mesma escrita e, se voltar, volta como aluno. Ele não pode ser removido; o dono ou o admin precisa rebaixá-lo antes. Ele também não altera o papel de ninguém (a regra já nega; a interface hoje deixa o seletor habilitado, e isso é corrigido aqui). O dono nunca vê "Sair" nem aparece como removível. O admin age como o dono.
6. **Remoção não é banimento.** A volta segue as regras normais: livre no curso aberto, com PIN no fechado (o PIN é só controle de interface; bloquear de verdade exigiria backend).
7. **Grupos de trabalho.** Quem sai deixa os grupos que **ainda não entregaram** (não existe `assignmentSubmissions/{courseId}/{assignmentId}/group_{groupId}`) e continua nos que já entregaram, que são histórico.
8. **Avisos**, sempre com texto pronto:
   - Colegas dos grupos que a pessoa deixou: tipo `groupChanges` (sino e e-mail), que já existe e pode ser desligado.
   - Dono e professores da turma, na saída: tipo novo `studentLeft` (sino e e-mail), que pode ser desligado.
   - Aluno removido ou readmitido: tipo novo `enrollmentChanged` (sino e e-mail), que **não** pode ser desligado.
   - `notificationPrefs` passa a ser legível por qualquer usuário autenticado (são só booleanos). Isso faz o opt-out funcionar quando quem dispara é outra pessoa e corrige um bug que já existe: hoje o dono que desliga "nova dúvida" continua recebendo, porque o navegador do aluno não consegue ler a preferência e `fetchPrefs` cai no padrão.
9. **Onde fica o botão:** num menu "⋮" do card em `/cursos`, nas abas Em Andamento e Concluídos. Depois da saída, o curso aparece em Disponíveis.
10. **Confirmação** com só as linhas que valem para o caso: deixa a turma e passa a aparecer como "saiu da turma" para o professor; o histórico fica guardado; *(curso fechado)* vai precisar do PIN para voltar; *(professor da turma)* deixa de ser professor; *(grupo em aberto)* sai do grupo e os colegas são avisados; os professores serão avisados. Botão vermelho, sem pedir para digitar o nome. A remoção usa o mesmo diálogo, do ponto de vista do professor, com "em curso aberto, o aluno pode voltar quando quiser".
11. **Volta pelo gate.** Quem tem matrícula encerrada e abre o curso vê "Você saiu desta turma em {data}. Voltar para a turma?" (ou "Você foi removido desta turma em {data}...") com [Voltar para a turma] e [Cancelar]. Cancelar leva para `/cursos`. No curso fechado, o PIN é pedido antes e já vale como confirmação.
12. **Reativação é sempre um ato explícito.** Gravar progresso nunca reativa ninguém. Recálculos disparados pelo professor (`persistProgress`, `updateAllUsersCourseProgress`, `recalculateQuizResults`) atualizam o histórico da matrícula encerrada sem mudar o estado dela.
13. **Readmissão** pelo professor só para quem foi removido (`endReason: "removed"`), na linha do aluno na aba Alunos. Quem saiu por conta própria só volta por decisão própria.

## Como cada leitor trata a matrícula encerrada

Todos passam pelo mesmo predicado (`isActiveEnrollment`), nunca por "o registro existe".

| Grupo | Onde | Tratamento |
|---|---|---|
| Listas do professor | `fetchCourseStudentsEnriched` (aba Alunos), `fetchAllCourseGrades`, `fetchAggregatedQuizGrades`, `fetchQuizStudentResults`, `attendanceData`, entregas (`useAssignmentSubmissionsData`, `useGradeAssignmentData`) e os CSV | Mostrar por último, com o selo "Saiu da turma" ou "Removido da turma" e a data |
| Números da turma | médias e percentuais da turma, `fetchOpinionResults`, `fetchCourseStudentCounts` (admin) | Excluir |
| Ações sobre a turma | `notifyNewAssignment`, `notifyNewQuiz`, `notifyAssessment`, `notifyNewContent`, avisos de publicação programada no Worker (`emailWorker/src/publications.js`), `closeDiscipline`/`reopenDiscipline`, sorteio do Quiz Gigi (`fetchEnrolledStudents`), "Sem grupo" do painel de entregas | Excluir |
| Acesso | `useCourseAccess` (via `checkStudentCourseEnrollment`) | Tratar como não matriculado e oferecer a volta (decisão 11) |
| Nomes nos grupos | `GroupPicker` | Incluir: quem saiu continua nos grupos que já entregaram e precisa aparecer pelo nome |
| Visão do aluno | `loadUserCourses` (`/cursos`), `useStudentCourses` (Minhas avaliações), `NotificationPrefs` | Em `/cursos`, cair em Disponíveis; nos outros dois, sair da lista |
| Recálculos | `persistProgress`, `updateAllUsersCourseProgress`, `recalculateQuizResults`, `enrollStudentInCourse` | Atualizam o histórico, nunca reativam |

`useStudentQuestions` só matricula se não houver matrícula nenhuma; como ele roda depois do gate, quem tem matrícula encerrada nunca chega lá sem ter reativado.

## Regras do banco

- `notifications/$userId/$notificationId`, dois casos novos, sempre só **criação** (`!data.exists()`):
  - colega de grupo: o aviso é `group_changes`, traz `courseId`, `assignmentId` e `groupId`, e **antes da escrita** (`root`) o autor e o destinatário são membros desse grupo. Por isso o aviso vai **na mesma escrita atômica** que tira o autor do grupo; numa escrita posterior ele já não seria membro.
  - professor da turma: o destinatário tem `coursesTeacher/{courseId}` e o autor tem matrícula nesse curso. (O caso do dono como destinatário já existe.)
- `notificationPrefs/$userId`: `.read` para `auth != null`.
- `studentCourses` não muda: o próprio aluno, o dono, o admin e o professor da turma já escrevem a matrícula. A proibição de remover um professor da turma e o congelamento da disciplina encerrada ficam na interface e no serviço, como o PIN.

## Etapas

Cada etapa é um commit (ou poucos), em português, no padrão conventional commits.

0. **Documentação:** `CONTEXT.md`, o ADR e este plano.
1. **Lógica pura** em `src/api/services/courses/enrollment.js`, com testes (vitest): `isActiveEnrollment`, o estado da matrícula para o gate (`none`/`active`/`ended`, com motivo e data), quem pode sair, remover ou readmitir quem (dono, admin, professor da turma, aluno; disciplina encerrada), a montagem das escritas do encerramento (matrícula, papel, grupos sem entrega, avisos) e da reativação, e as linhas do diálogo de confirmação.
2. **Regras** de `notifications` e `notificationPrefs`, com testes no emulador (padrão de `teacherRole.rules.emulator.test.js`): colega de grupo cria aviso só na mesma escrita em que sai e só para quem estava no grupo; aluno não cria aviso para colega fora do grupo; aluno avisa o professor da turma só de curso em que tem matrícula; ninguém edita aviso alheio.
3. **Serviço** `endEnrollment`, `reactivateEnrollment` e `readmitStudent`: lê grupos, entregas e preferências, grava tudo numa escrita atômica e manda os e-mails depois, sem bloquear. Saem `unenrollStudentFromCourse` e `removeStudentFromCourse`; os comentários de `quizGigi.js` e `scripts/migrateQuizGigiPath.mjs` que citam a segunda são ajustados. Testes no emulador, agindo como aluno, como professor da turma e como dono: o histórico fica intacto, o professor da turma que sai perde o papel, disciplina encerrada recusa, grupo com entrega mantém o membro.
4. **Leitores:** aplicar a tabela acima. Testes para os pontos onde o erro custa mais: `closeDiscipline` não conclui quem saiu, os avisos para a turma pulam quem saiu, o recálculo de progresso não reativa, a contagem do admin. O Worker tem deploy próprio (`wrangler`): o PR avisa que ele precisa ser publicado junto.
5. **Gate:** `useCourseAccess` passa a distinguir os três estados; diálogo de volta; PIN seguido de reativação no curso fechado; recusa com explicação na disciplina encerrada.
6. **Tela do aluno:** menu "⋮" no card de `/cursos` e o diálogo de confirmação.
7. **Tela do professor:** na aba Alunos, remoção religada com o diálogo novo, selo e ordenação dos encerrados por último, "Readmitir" para os removidos, seletor de papel desabilitado para o professor da turma (correção) e para matrículas encerradas, remoção desabilitada para professor da turma ("rebaixe para estudante antes").
8. **Avisos:** os registros in-app já saem da etapa 1 (vão na escrita atômica); aqui entram os e-mails (`student_left`, `enrollment_changed` e a mensagem de saída em `group_changes`, com os modelos no Worker) e os três pontos de sempre (`notifications.js`, `DEFAULT_PREFS`, `TYPES` em `NotificationPrefs.jsx`; `enrollmentChanged` fica fora das preferências). `NotificationPrefs` passa a listar também os cursos que a pessoa conduz (dono ou professor da turma): hoje ela lista só matrículas, então o dono não tem onde desligar `newQuestion` nem, agora, `studentLeft`.
9. **E2E** (`e2e/saida-do-curso.spec.js`): o aluno sai de um curso aberto, o curso aparece em Disponíveis, ele volta pelo diálogo e o progresso está lá; num curso fechado, a volta pede o PIN; o professor remove, o aluno aparece por último com o selo e é readmitido; na disciplina encerrada, sair e remover ficam desabilitados.

## Registro da implementação

- Etapa 1: a lógica pura e o serviço moram juntos em `src/api/services/courses/enrollment.js`, como em `courseType.js`. O estado da matrícula (`isActiveEnrollment`, `enrollmentRowFlags`, `sortEndedLast`, `enrollmentEndedLabel`) foi para `src/shared/enrollmentStatus.js`, porque o Worker também precisa dele; `enrollment.js` o reexporta, e a tela importa sempre por `$api`.
- Os avisos no sino saem da etapa 1, na mesma escrita do encerramento: é a única forma de a regra do aviso ao colega de grupo enxergar o autor ainda como membro antes e já fora depois. A etapa 8 ficou com os e-mails (`emailEnrollmentNotifications`), a preferência `studentLeft` e os modelos `student_left` e `enrollment_changed` no Worker, com rodapé próprio (o de remoção não diz "dá pra desligar").
- `fetchCourseStudentsEnriched` traz só a turma por padrão; as listas do professor pedem `{ includeEnded: true }`. Quem esquecer de escolher fica do lado seguro (não avisa quem saiu).
- No CSV de notas, quem está fora da turma vai marcado na coluna Status ("Aprovado (Saiu da turma em 12/10/2026)"): uma coluna nova quebraria a importação, que valida o cabeçalho. O CSV de presença, que não é importado, ganhou a coluna "Situação na turma".
- O gate decide por uma função pura, `decideCourseAccess`. Como o `PinAccessModal` chama `onClose` logo depois de `onSubmit`, o hook marca o acesso como liberado antes de esperar a reativação; sem isso, a volta pelo PIN jogava o aluno para `/cursos`.
- Depois da saída, a lista de cursos chama `refreshUserDetails`: o professor da turma que sai perde o papel no banco, e o contexto de autenticação não pode seguir com o antigo (o gate o deixaria entrar direto).
- Na aba Alunos, o botão diz só "Remover" para caber na coluna; o nome acessível é "Remover da turma". O `checkCurrentUserRole` saiu: o seletor de papel agora segue `canChangeCourseRole`, que é o que a regra do banco já fazia.
- As preferências de notificação passaram a listar também os cursos que a pessoa conduz (criados por ela e `coursesTeacher`), além das matrículas ativas.
- Testes: `enrollment.test.js` (42), `enrollment.rules.emulator.test.js` (14), `enrollment.emulator.test.js` (13), `enrollmentReaders.emulator.test.js` (7), `src/shared/enrollmentStatus.test.js` (6), casos novos em `courseType`, `gradeSummary`, `gradesCsv`, `attendance` e no teste do Worker, e `e2e/saida-do-curso.spec.js` (8). A suíte E2E passou a ter 32.
- Para publicar: `firebase deploy --only database` (regras) e `wrangler deploy` no `emailWorker/` (destinatários dos avisos programados e modelos de e-mail novos), junto com o app.

## Fora do escopo

- Apagar o histórico de um aluno (por exemplo, a pedido via LGPD). Se vier, é uma feature do admin.
- Banir um aluno de um curso.
- Desfazer pelo professor a saída feita pelo próprio aluno.
- A brecha que parece existir nas regras de `users/$userId` (autopromoção a professor de qualquer curso e talvez ao `role` global): vai numa issue própria, a confirmar no emulador.
