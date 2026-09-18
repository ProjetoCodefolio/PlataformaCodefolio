# Plano: importar questões prontas por JSON

Status: **implementado em 18/09/2026**, no commit `feat(quiz): importar questoes prontas por JSON`. Escolhido o encaixe "barato" da seção 2 (botão dentro do `PdfQuizGenerator`); a extração do `GeneratedQuestionsReview.jsx` continua valendo como refatoração futura. Escrito em 18/09/2026.

## Por que

Em 17/09/2026 o quiz "Aulão de Reposição" (curso POO) apareceu com as 30 questões sem `id` no banco, o que fazia o editor mostrar a edição de uma questão em todas e faria o aluno responder todas de uma vez. A auditoria (`node scripts/auditQuizQuestionIds.mjs`) mostrou que nenhum caminho de escrita do app grava questão sem `id`: as questões foram geradas por IA fora da plataforma e coladas direto no banco, no formato cru `{question, options, correctOption}`. Outros 2 quizzes do banco têm a mesma assinatura, um deles de 18/03/2025, anterior ao gerador por PDF do app, ou seja, é prática recorrente.

A correção já feita (`ensureQuestionIds` na leitura, commit `9cb34ee`) impede que o estrago volte a aparecer nas telas, mas não remove o incentivo: quem já gerou as questões em outro lugar não tem por onde importá-las pelo app, porque o gerador só aceita PDF. Este plano fecha essa porta.

## Ideia central

O app já tem a esteira certa. Depois que o gerador por PDF devolve as questões, existe uma área de conferência onde o professor revisa, edita inline, apaga o que não quer e só então clica em "Adicionar N Questões ao Quiz", que grava por `addMultipleQuestionsToQuiz` com todas as garantias (id, `questionType`, campos de nota e imagem normalizados). Falta apenas uma segunda ENTRADA nessa mesma esteira. Colar JSON vira mais uma fonte, ao lado do PDF, e não um segundo caminho de gravação.

## 1. Parser, puro e testável

Módulo novo `src/api/services/courses/quizGenerator/pastedQuestions.js`, com `parseQuestoesColadas(texto)` devolvendo `{ questoes, erros }`.

Extração do JSON: `responseParser.js` já sabe achar um array JSON no meio de texto solto (cerca de ```json, prosa em volta, objeto `{questions: [...]}`). Extrair essa parte para um helper compartilhado e reusar nos dois, em vez de escrever um segundo parser tolerante. Os testes de `responseParser.test.js` protegem o recorte.

Validação por questão, com erro posicional em vez de descarte silencioso (é a diferença que importa para quem colou: precisa saber qual questão está errada e por quê):

- enunciado: `question`, não vazio;
- alternativas: `options`, de 2 a 5 itens não vazios, que é o limite que o editor já impõe;
- gabarito: aceita `correctOption` (índice) ou `correct_answer` (letra A-D, número, ou o texto exato da alternativa), reaproveitando `resolveCorrectOption` do `questionApiClient.js`, hoje privado, que passa a ser exportado;
- pergunta sem resposta certa: `graded: false`, com `scale: "likert-5"` opcional (`LIKERT_5_SCALE`); nesse caso não exige gabarito;
- questão aberta: `questionType: "open-ended"` ou ausência de `options`, aceitando `expectedAnswer`, campo que o gerador já usa;
- imagem opcional: `imageUrl`, `imageWidth`, `imageHeight`;
- `id` vindo na colagem é ignorado de propósito. Quem dá o id é a gravação, e é isso que evita a versão "colou com id repetido" do mesmo bug.

Teto de 100 questões por colagem, para não travar a tela de conferência.

Decidido assim na implementação: com erros na lista, a importação inteira é bloqueada e a tela mostra "questão 7: `correctOption` fora do intervalo", em vez de importar as válidas e engolir o resto.

## 2. Interface

`PasteQuestionsDialog.jsx`: textarea, exemplo do formato aceito visível, botão "Conferir". No sucesso alimenta o mesmo estado `generatedQuestions` da área de conferência, e dali em diante o fluxo é o que já existe.

Duas opções de encaixe:

**Recomendada.** Extrair o bloco de conferência (preview, edição inline, botão de adicionar) do `PdfQuizGenerator`, hoje com 776 linhas, para `GeneratedQuestionsReview.jsx`, e subir o estado `generatedQuestions` para o `QuestionEditorPanel`. O `PdfQuizGenerator` passa a ser só a fonte "PDF", o diálogo de colagem é a fonte "JSON", e as duas entregam para a mesma conferência. Uma terceira fonte no futuro custa três linhas.

**Barata.** Botão de colar dentro do próprio `PdfQuizGenerator`, ao lado dos ícones de chave e configurações, mexendo só no título da seção. Bem menor, mas o componente passa a fazer mais do que o nome diz.

## 3. Testes

- unidade do parser: cada formato aceito (índice, letra, texto da alternativa, Likert, aberta) e cada erro (não é array, enunciado vazio, uma opção só, gabarito fora do intervalo, mais de 5 opções, acima do teto), e a garantia de que `id` colado é descartado;
- fluxo: colar JSON e ver as N questões aparecerem na conferência, nos moldes de `QuestionList.test.jsx`;
- extração do JSON coberta pelos testes já existentes.

## 4. Fora de escopo, de propósito

Gravar direto no banco sem conferência, aceitar CSV, aceitar chaves em português, e mexer no gerador por PDF. Isso também não impede ninguém de colar no console do Firebase: quem segura essa ponta continua sendo `ensureQuestionIds` na leitura.

## Ordem de execução

Parser com testes primeiro, interface depois.
