# Matrícula encerrada em vez de apagada

Sair do curso (aluno) e ser removido da turma (professor) não apagam a matrícula nem o histórico no curso: a matrícula passa a encerrada, com quem a encerrou e quando, e quem volta reativa a mesma matrícula. Apagar tudo, como fazia a antiga exclusão em cascata, deixaria o aluno zerar tentativas de quiz saindo e voltando, faria quem saiu por engano perder presença e notas sem volta, e tiraria do professor o registro de evasão da turma.

## Consequences

- Todo leitor de matrícula decide explicitamente como trata a encerrada, por um predicado único de matrícula ativa: as listas do professor mostram por último e marcada; números da turma, avisos para a turma, encerramento de disciplina e sorteios a ignoram; o acesso a trata como não matriculado (curso fechado volta a pedir PIN).
- Reativação é um ato explícito, só na entrada do próprio aluno (ou readmissão pelo professor, para quem foi removido). Gravar progresso nunca reativa, porque recálculos disparados pelo professor tocam a matrícula de todos.
- Remoção não é banimento: o PIN é só controle de interface no cliente, e um bloqueio de verdade exigiria backend.
