#!/usr/bin/env node
// Migração do nó do Quiz Gigi para o caminho único.
//
// Até a correção, o serviço gravava os resultados em
//
//   quizGigi/courses/{courseId}/quizzes/{quizId}/...
//
// caminho que as regras do banco não cobriam (os curingas casavam com a string
// literal "courses"), então só quem tinha role 'admin' global conseguia
// escrever ali. O formato passou a ser
//
//   quizGigi/{courseId}/{quizId}/...
//
// que é o que as regras descrevem e o que as cascatas de exclusão varrem
// (deleteCourse, removeQuiz, removeStudentFromCourse). Este script move o que
// ficou para trás e remove a sub-árvore antiga.
//
// Uso:
//   # dry-run (não escreve nada) — comece SEMPRE por aqui
//   GOOGLE_APPLICATION_CREDENTIALS=./sa.json node scripts/migrateQuizGigiPath.mjs
//   # aplicar
//   GOOGLE_APPLICATION_CREDENTIALS=./sa.json node scripts/migrateQuizGigiPath.mjs --apply
//   # no emulador
//   FIREBASE_DATABASE_EMULATOR_HOST=127.0.0.1:9000 node scripts/migrateQuizGigiPath.mjs --apply
//
// Flags:
//   --apply      grava as mudanças (sem isto, apenas simula)
//   --force      sobrescreve quizzes que já existam no destino (default: pula)
//   --keep-old   não remove a sub-árvore antiga depois de mover

import { initAdminDb } from "./lib/firebaseAdmin.mjs";

const args = process.argv.slice(2);
const has = (f) => args.includes(f);

const apply = has("--apply");
const force = has("--force");
const keepOld = has("--keep-old");

const { db, mode } = initAdminDb();

console.log(`\nMigração do nó quizGigi — ${mode}`);
console.log(apply ? "MODO: aplicar\n" : "MODO: simulação (use --apply para gravar)\n");

const antigoSnap = await db.ref("quizGigi/courses").get();

if (!antigoSnap.exists()) {
  console.log("Nada a migrar: quizGigi/courses não existe.\n");
  process.exit(0);
}

const antigo = antigoSnap.val() || {};
const updates = {};
let movidos = 0;
let pulados = 0;

for (const [courseId, courseNode] of Object.entries(antigo)) {
  const quizzes = courseNode?.quizzes;
  if (!quizzes || typeof quizzes !== "object") {
    console.log(`  curso ${courseId}: sem nó 'quizzes' — nada a mover`);
    continue;
  }

  for (const [quizId, quizNode] of Object.entries(quizzes)) {
    if (!quizNode || typeof quizNode !== "object") continue;

    const destino = `quizGigi/${courseId}/${quizId}`;
    const jaExiste = (await db.ref(destino).get()).exists();

    if (jaExiste && !force) {
      console.log(`  PULADO  ${destino} — já existe no destino (use --force para sobrescrever)`);
      pulados += 1;
      continue;
    }

    const respostas = Object.values(quizNode.results || {}).reduce(
      (total, questao) =>
        total +
        Object.keys(questao?.correctAnswers || {}).length +
        Object.keys(questao?.wrongAnswers || {}).length,
      0
    );

    console.log(
      `  MOVE    ${destino} — ${Object.keys(quizNode.results || {}).length} questão(ões), ${respostas} resposta(s)` +
        (jaExiste ? " [sobrescreve]" : "")
    );
    updates[destino] = quizNode;
    movidos += 1;
  }
}

if (movidos > 0 && !keepOld) {
  updates["quizGigi/courses"] = null;
}

console.log(
  `\nResumo: ${movidos} quiz(zes) para mover, ${pulados} pulado(s).` +
    (movidos > 0 && !keepOld ? " A sub-árvore quizGigi/courses será removida." : "")
);

if (!apply) {
  console.log("Nada foi gravado (simulação).\n");
  process.exit(0);
}

if (Object.keys(updates).length === 0) {
  console.log("Nada a gravar.\n");
  process.exit(0);
}

await db.ref().update(updates);
console.log("Migração aplicada.\n");
process.exit(0);
