#!/usr/bin/env node
// Preenche a fila de publicações (`publicationQueue`) com o que JÁ estava
// programado antes de a fila existir.
//
// A fila é mantida pelo app a cada gravação de data. Itens programados antes
// disso (ou antes do deploy) não estão nela, e o cron do Worker só avisa a
// turma do que está na fila: sem este script, esses itens aparecem na data sem
// aviso nenhum.
//
// Só CRIA entradas que faltam. Entrada que já existe fica como está: ela pode
// estar vencendo agora ("Publicar agora") ou reservada pelo cron no meio de um
// aviso. Rodar duas vezes não duplica nada.
//
// Uso:
//   # dry-run (não escreve nada) — comece SEMPRE por aqui
//   GOOGLE_APPLICATION_CREDENTIALS=./sa.json node scripts/backfillPublicationQueue.mjs
//   # aplicar
//   GOOGLE_APPLICATION_CREDENTIALS=./sa.json node scripts/backfillPublicationQueue.mjs --apply
//   # no emulador
//   FIREBASE_DATABASE_EMULATOR_HOST=127.0.0.1:9000 node scripts/backfillPublicationQueue.mjs --apply
//
// Flags:
//   --course <id>   restringe a um curso
//   --apply         grava (sem ela, só lista)

import { initAdminDb } from "./lib/firebaseAdmin.mjs";
import { buildQueueEntriesFromNodes } from "../src/shared/publicationQueueEntries.js";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const courseIdx = args.indexOf("--course");
const onlyCourse = courseIdx >= 0 ? args[courseIdx + 1] : null;

const main = async () => {
  const { db, mode } = initAdminDb();
  console.log(`🗓️  Preenchimento da fila de publicações — ${mode}`);

  const ler = async (caminho) => (await db.ref(caminho).get()).val() || {};
  const doCurso = (no) => (onlyCourse ? { [onlyCourse]: no[onlyCourse] || {} } : no);

  const [courseContent, courseVideos, courseSlides, courseQuizzes, filaAtual] = await Promise.all([
    ler("courseContent"),
    ler("courseVideos"),
    ler("courseSlides"),
    ler("courseQuizzes"),
    ler("publicationQueue"),
  ]);

  const desejadas = buildQueueEntriesFromNodes(
    {
      courseContent: doCurso(courseContent),
      courseVideos: doCurso(courseVideos),
      courseSlides: doCurso(courseSlides),
      courseQuizzes: doCurso(courseQuizzes),
    },
    new Date()
  );

  const faltando = Object.entries(desejadas).filter(([key]) => !filaAtual[key]);
  const jaNaFila = Object.keys(desejadas).length - faltando.length;

  console.log(`\nProgramados encontrados: ${Object.keys(desejadas).length}`);
  console.log(`Já na fila: ${jaNaFila}`);
  console.log(`Faltando: ${faltando.length}\n`);
  for (const [key, entrada] of faltando.sort(([, a], [, b]) => a.publishAt.localeCompare(b.publishAt))) {
    console.log(`  ${entrada.publishAt}  ${entrada.kind.padEnd(7)}  ${key}`);
  }

  if (faltando.length === 0) {
    console.log("Nada a gravar.");
    process.exit(0);
  }
  if (!apply) {
    console.log("\n(DRY-RUN) Nada foi escrito. Rode de novo com --apply para aplicar.");
    process.exit(0);
  }

  const updates = Object.fromEntries(
    faltando.map(([key, entrada]) => [`publicationQueue/${key}`, entrada])
  );
  await db.ref().update(updates);
  console.log(`\n✅ Aplicado. ${faltando.length} entrada(s) criada(s).`);
  process.exit(0);
};

main().catch((e) => {
  console.error("❌ Falha no preenchimento:", e);
  process.exit(1);
});
