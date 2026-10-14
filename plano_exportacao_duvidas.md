# Plano: exportar as dúvidas dos alunos

Status: **em implementação** na branch `feat/exportar-duvidas`. Escrito em 14/10/2026, a partir de uma rodada de perguntas (`/grill-with-docs`) com o Matheus. Os termos estão no `CONTEXT.md`.

## Por que

O professor quer levar as dúvidas que os alunos registram para fora da plataforma, de dois jeitos: guardar e analisar numa planilha, e transformar as dúvidas escolhidas numa lista de exercícios para a turma.

## Decisões

1. **Duas exportações, com públicos diferentes.** A **planilha de dúvidas** é do professor e leva o autor. A **lista de exercícios** vai para a turma e **nunca leva o autor**, pela mesma regra da apresentação em aula.
2. **As duas saem só das dúvidas escolhidas pelo professor.** A escolha é feita na hora, com caixas de seleção na tabela da aba "Dúvidas" e um "marcar todas as visíveis" que respeita os filtros (vídeo, busca, só as não discutidas). **Nada é gravado no banco**: fechou a aba, a escolha some.
3. **Quem exporta:** quem já abre a aba "Dúvidas", ou seja, dono, admin e co-professor (a aba não é escondida do co-professor; a regra de `courseQuestions` também aceita `coursesTeacher`).
4. **Planilha de dúvidas:** download direto, sem prévia. `duvidas_{curso}_{data}.csv`, no padrão dos outros CSV do projeto (vírgula, BOM UTF-8). Colunas: Conteúdo, Dúvida, Autor, Registrada em, Situação, Discutida em. Linhas na ordenação ativa da tabela. Sem e-mail, matrícula nem link.
5. **Lista de exercícios:** abre uma **prévia editável** com as dúvidas escolhidas, sem autor. O professor edita o texto de cada item, remove itens e **reordena arrastando** (`@dnd-kit`, já usado na ordem dos conteúdos). Nada disso altera a dúvida original.
6. **Ordem inicial da lista:** a ordem dos conteúdos no curso (`fetchCourseContent`), e dentro do mesmo conteúdo a data da dúvida. Conteúdo excluído (o título fica congelado na dúvida) vai para o fim.
7. **Cabeçalho editável, já preenchido:** nome do curso (título do curso), título da lista ("Lista de exercícios"), data (de hoje, pode ser apagada) e instruções (opcional, vazio). Não guarda nada entre uma abertura e outra.
8. **Opções da lista, todas desligadas por padrão:** campos "Nome" e "Matrícula" para o aluno preencher; o conteúdo de cada exercício ("Referente a: Aula 3"); espaço para resposta, com a mesma quantidade de linhas para todos os exercícios.
9. **Formato da lista:** corrida, numerada de 1 a N, sem seções por conteúdo. Sai em `.docx` editável (biblioteca `docx`) ou PDF pronto (`pdfmake`). As duas bibliotecas são carregadas **só no clique** (`import()` dinâmico), para não pesar no site.
10. **Versões fixadas:** `docx@9.8.1` (a 9.11.0 tinha um dia de publicada em 14/10/2026) e `pdfmake@0.3.11`.

## Etapas

1. **Lógica pura** em `src/api/services/courses/questionExport.js`, com testes: montar o CSV, a ordem inicial da lista e o modelo do documento (cabeçalho, itens numerados, opções) que os dois geradores consomem.
2. **Seleção e planilha** na aba "Dúvidas": coluna de caixas na tabela, caixa nos cartões do celular, "marcar todas as visíveis", contador e os botões "Planilha" e "Lista de exercícios".
3. **Prévia da lista:** diálogo com cabeçalho, opções, itens editáveis e arrastáveis.
4. **Geradores** `.docx` e PDF a partir do modelo.
5. **E2E:** o professor escolhe dúvidas, baixa a planilha (confere colunas e que respeitou a escolha) e abre a prévia (confere que não há autor). O conteúdo binário do `.docx` e do PDF não é conferido no E2E, só que o download acontece.

## Fora do escopo

- Guardar a escolha ou o cabeçalho entre sessões.
- Exportar direto da apresentação em aula.
- Gabarito ou respostas na lista.
