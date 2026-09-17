#!/usr/bin/env node
// Auditoria SOMENTE LEITURA dos ids das questões de quiz.
//
// `question.id` é a chave única de endereçamento de uma questão: rascunho do
// editor do professor, resposta do aluno (`userAnswers[question.id]`), mapa
// gravado em `detailedAnswers` e recálculo de nota. Questão sem id, ou com o id
// repetido de outra, faz essas chaves colidirem — editar uma questão aparece
// como edição de todas, e responder uma responde todas.
//
// A plataforma já teve três formatos de id por questão ao longo do tempo
// (`Date.now()`, `quizQuestions.length + 1`, índice injetado na leitura) antes
// do uuid atual, e o segundo colide por construção: apagar uma questão e
// adicionar outra reusa um id existente. Este script encontra os quizzes que
// ficaram com esse estrago no banco.
//
// NÃO escreve nada e NÃO precisa de credencial: `courses` e
// `courseQuizzes/{courseId}` são de leitura pública nas regras do banco.
//
// Uso:
//   node scripts/auditQuizQuestionIds.mjs                 # todos os cursos
//   node scripts/auditQuizQuestionIds.mjs POO             # filtra pelo título do curso
//   node scripts/auditQuizQuestionIds.mjs --course <id>   # um curso só
//   RTDB_URL=http://127.0.0.1:9000/... node scripts/auditQuizQuestionIds.mjs

const args = process.argv.slice(2);
const getFlag = (nome) => {
  const i = args.indexOf(nome);
  return i >= 0 && args[i + 1] ? args[i + 1] : null;
};
const cursoAlvo = getFlag("--course");
const termo = args.find((a) => !a.startsWith("--") && a !== cursoAlvo) || "";

const PROJECT_ID = process.env.GCLOUD_PROJECT || "plataformacodefolio";
const BASE =
  process.env.RTDB_URL || `https://${PROJECT_ID}-default-rtdb.firebaseio.com`;

const ler = async (caminho) => {
  const resposta = await fetch(`${BASE}/${caminho}.json`);
  if (!resposta.ok) {
    throw new Error(`GET ${caminho} devolveu ${resposta.status}`);
  }
  return resposta.json();
};

/**
 * Diagnostica a lista de questões de um quiz.
 * @param {*} questions - como veio do banco
 * @returns {{total: number, semId: number[], repetidos: Array, idZero: number[], formatos: Object}}
 */
const diagnosticar = (questions) => {
  const lista = Array.isArray(questions)
    ? questions
    : Object.values(questions || {});

  const semId = [];
  const idZero = [];
  const porId = new Map();
  const formatos = {};

  lista.forEach((questao, index) => {
    if (!questao || typeof questao !== "object") return;

    const id = questao.id;
    if (id === undefined || id === null || String(id).trim() === "") {
      semId.push(index + 1);
      return;
    }
    if (id === 0) idZero.push(index + 1);

    const formato =
      typeof id === "number"
        ? String(id).length >= 13
          ? "number (Date.now)"
          : "number (sequencial/índice)"
        : /^[0-9a-f-]{36}$/i.test(id)
          ? "uuid"
          : id.startsWith("pdf-gen-")
            ? "pdf-gen"
            : "string (outro)";
    formatos[formato] = (formatos[formato] || 0) + 1;

    const chave = String(id);
    porId.set(chave, [...(porId.get(chave) || []), index + 1]);
  });

  const repetidos = [...porId.entries()]
    .filter(([, posicoes]) => posicoes.length > 1)
    .map(([id, posicoes]) => ({ id, posicoes }));

  return { total: lista.length, semId, repetidos, idZero, formatos };
};

/** Títulos dos conteúdos do curso, para nomear o quiz no relatório. */
const titulosDoCurso = async (courseId) => {
  const titulos = new Map();
  for (const no of ["courseVideos", "courseContent", "courseSlides"]) {
    try {
      const dados = await ler(`${no}/${courseId}`);
      Object.entries(dados || {}).forEach(([id, item]) => {
        if (item?.title) titulos.set(id, item.title);
      });
    } catch {
      // Nó ausente ou sem permissão: o relatório cai no id do quiz.
    }
  }
  return titulos;
};

const cursos = await ler("courses");
const alvos = Object.entries(cursos || {}).filter(([id, curso]) => {
  if (cursoAlvo) return id === cursoAlvo;
  if (!termo) return true;
  return String(curso?.title || "")
    .toLocaleLowerCase("pt-BR")
    .includes(termo.toLocaleLowerCase("pt-BR"));
});

console.log(`Banco: ${BASE}`);
console.log(`Cursos analisados: ${alvos.length}\n`);

let comProblema = 0;

for (const [courseId, curso] of alvos) {
  let quizzes;
  try {
    quizzes = await ler(`courseQuizzes/${courseId}`);
  } catch (erro) {
    console.log(`! ${curso?.title || courseId}: ${erro.message}`);
    continue;
  }
  if (!quizzes) continue;

  const quebrados = Object.entries(quizzes)
    .map(([quizId, quiz]) => [quizId, diagnosticar(quiz?.questions)])
    .filter(([, d]) => d.semId.length > 0 || d.repetidos.length > 0 || d.idZero.length > 0);

  if (quebrados.length === 0) continue;

  comProblema += quebrados.length;
  const titulos = await titulosDoCurso(courseId);

  console.log(`CURSO ${curso?.title || "(sem título)"}  [${courseId}]`);
  for (const [quizId, d] of quebrados) {
    const nome = titulos.get(quizId.replace(/^slide_/, "")) || titulos.get(quizId) || "(conteúdo não encontrado)";
    console.log(`  quiz "${nome}"  [${quizId}]  ${d.total} questões`);
    if (d.semId.length) console.log(`    SEM id nas posições: ${d.semId.join(", ")}`);
    if (d.idZero.length) console.log(`    id = 0 (falsy, impede salvar) nas posições: ${d.idZero.join(", ")}`);
    for (const r of d.repetidos) {
      console.log(`    id REPETIDO "${r.id}" nas posições: ${r.posicoes.join(", ")}`);
    }
    console.log(`    formatos de id: ${JSON.stringify(d.formatos)}`);
  }
  console.log("");
}

console.log(
  comProblema === 0
    ? "Nenhum quiz com id de questão faltando ou repetido."
    : `${comProblema} quiz(zes) com id de questão faltando ou repetido.`
);
