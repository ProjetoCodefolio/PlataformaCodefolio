# Codefólio

Plataforma de cursos e disciplinas da UNIPAMPA: o professor publica conteúdos (vídeos, slides, materiais e quizzes), e os alunos assistem, respondem e tiram dúvidas.

## Language

### Cursos e disciplinas

**Curso**:
Oferta auto-ritmada: cada aluno conclui ao terminar todo o conteúdo.
_Avoid_: Trilha

**Disciplina**:
Oferta com semestre: a conclusão vale para a turma inteira e só acontece quando o professor encerra a disciplina.
_Avoid_: Matéria, turma

**Disciplina encerrada**:
Disciplina cujo semestre o professor declarou terminado. A turma fica congelada: ninguém sai nem é removido até a disciplina ser reaberta.
_Avoid_: Disciplina arquivada (arquivar só tira do catálogo)

### Matrícula

**Matrícula**:
Vínculo de um aluno com um curso, que o torna parte da turma. Quem está matriculado aparece nas listas, notas e presença do curso. Não há um ato de se matricular: o vínculo surge quando o aluno começa a usar o curso.
_Avoid_: Inscrição

**Histórico no curso**:
Progresso, resultados de quiz e demais registros que o aluno produziu no curso. É distinto da matrícula: pode continuar existindo depois que ela termina.
_Avoid_: Dados do aluno

**Matrícula ativa**:
Matrícula de quem faz parte da turma agora.

**Matrícula encerrada**:
Matrícula de quem saiu ou foi removido. Continua existindo, com quem a encerrou e quando, para que o professor ainda veja esse aluno, marcado como fora da turma.
_Avoid_: Matrícula apagada, ex-aluno

**Encerramento da matrícula**:
Passagem da matrícula de ativa para encerrada. O histórico no curso é preservado, e o aluno retoma de onde parou se voltar, inclusive com as tentativas de quiz já gastas.
_Avoid_: Desmatrícula, cancelamento, exclusão do aluno

**Reativação**:
Volta de quem tem matrícula encerrada, por decisão do próprio aluno: a mesma matrícula torna a ficar ativa, respeitando as regras de acesso do curso.
_Avoid_: Rematrícula, nova matrícula

**Readmissão**:
Desfazer uma remoção da turma, feito por quem conduz o curso. Não se aplica a quem saiu por conta própria.
_Avoid_: Reintegração, rematrícula

**Saída do curso**:
Encerramento da matrícula feito pelo próprio integrante da turma. Se ele for professor da turma, perde também esse papel, e uma volta futura é como aluno comum.
_Avoid_: Abandono, desistência

**Remoção da turma**:
Encerramento da matrícula de um aluno feito por quem conduz o curso. Tem o mesmo efeito da saída; muda só quem a faz. Não é banimento: o aluno pode voltar pelas regras normais de acesso ao curso. Professor da turma não é removível; precisa antes ser rebaixado a aluno.
_Avoid_: Expulsão, exclusão do aluno

### Autoridade sobre o curso

**Dono do curso**:
Quem criou o curso e responde pelo seu cadastro. O admin tem, sobre qualquer curso, a mesma autoridade do dono.
_Avoid_: Criador, autor

**Professor da turma**:
Aluno matriculado a quem o dono deu o papel de conduzir aquele curso específico. Conduz conteúdo, notas e alunos, mas não altera o papel de ninguém.
_Avoid_: Co-professor, monitor, professor (sozinho, é ambíguo com o papel global)

**Rebaixamento**:
Retirada do papel de professor da turma por dono ou admin; o integrante continua matriculado como aluno.
_Avoid_: Despromoção, revogação

### Dúvidas

**Dúvida**:
Pergunta ou consideração que um aluno registra sobre um conteúdo específico do curso. Guarda quem perguntou, mas a autoria só é visível para quem conduz o curso.
_Avoid_: Pergunta, questão (questão é a de quiz)

**Dúvida discutida**:
Dúvida que o professor já tratou com a turma. Depois de discutida, o aluno não pode mais apagá-la.
_Avoid_: Respondida, resolvida

**Apresentação de dúvidas**:
Exibição das dúvidas em aula, uma por vez, sempre sem o autor, nem para o professor.
_Avoid_: Projeção, modo aula

**Planilha de dúvidas**:
Exportação das dúvidas escolhidas pelo professor, com autor, conteúdo e situação, para uso do próprio professor.
_Avoid_: Relatório de dúvidas

**Lista de exercícios**:
Documento para a turma montado a partir das dúvidas escolhidas pelo professor, sem autor, em versão editável ou pronta para distribuir.
_Avoid_: Apostila, FAQ
