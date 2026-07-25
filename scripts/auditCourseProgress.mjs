#!/usr/bin/env node
// Auditoria SOMENTE LEITURA do progresso de cursos.
//
// Localiza:
//  1. Progresso "órfão": nós videoProgress/{uid}/{courseId}/{id} assistidos cujo
//     `id` não é mais um conteúdo do curso (sintoma da perda permanente do check
//     após deletar+recadastrar conteúdo).
//  2. Divergência de agregado: studentCourses/{uid}/{c}.progress vs. o valor
//     recalculado com a definição única do app.
//
// NÃO escreve nada. Gera `progress-audit.json` e `progress-audit.csv`.
//
// Uso:
//   # emulador
//   FIREBASE_DATABASE_EMULATOR_HOST=127.0.0.1:9000 node scripts/auditCourseProgress.mjs
//   # produção (conta de serviço)
//   GOOGLE_APPLICATION_CREDENTIALS=./sa.json node scripts/auditCourseProgress.mjs --course <courseId>
//
// Flags:
//   --course <id>   audita apenas um curso (default: todos)
//   --out <dir>     diretório de saída (default: diretório atual)

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { initAdminDb, readFlippedContent } from "./lib/firebaseAdmin.mjs";
import {
  collectCurrentContentIds,
  findOrphanProgress,
  recomputeAggregate,
  buildQuizPassedById,
  findOrphanQuizResults,
} from "../src/api/services/courses/progressAudit.js";

const args = process.argv.slice(2);
const getFlag = (name, def = null) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};
const onlyCourse = getFlag("--course");
const outDir = getFlag("--out", process.cwd());

const csvEscape = (v) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const main = async () => {
  const { db, mode } = initAdminDb();
  console.log(`🔎 Auditoria de progresso — ${mode}`);

  // Lê o progresso e os resultados de quiz inteiros uma vez.
  const [coursesSnap, videoProgressSnap, studentCoursesSnap, quizResultsSnap] =
    await Promise.all([
      db.ref("courses").get(),
      db.ref("videoProgress").get(),
      db.ref("studentCourses").get(),
      db.ref("quizResults").get(),
    ]);

  const courses = coursesSnap.val() || {};
  const videoProgress = videoProgressSnap.val() || {};
  const studentCourses = studentCoursesSnap.val() || {};
  const quizResults = quizResultsSnap.val() || {};

  const courseIds = onlyCourse
    ? [onlyCourse]
    : Object.keys(courses);

  // Índice reverso: courseId → uid → { id: node }
  const progressByCourse = {};
  for (const [uid, byCourse] of Object.entries(videoProgress)) {
    if (!byCourse || typeof byCourse !== "object") continue;
    for (const [courseId, byId] of Object.entries(byCourse)) {
      (progressByCourse[courseId] ||= {})[uid] = byId;
    }
  }
  // Índice reverso dos resultados de quiz: courseId → uid → { key: node }
  const quizByCourse = {};
  for (const [uid, byCourse] of Object.entries(quizResults)) {
    if (!byCourse || typeof byCourse !== "object") continue;
    for (const [courseId, byKey] of Object.entries(byCourse)) {
      (quizByCourse[courseId] ||= {})[uid] = byKey;
    }
  }

  const orphanRows = [];
  const aggregateRows = [];
  const orphanQuizRows = [];
  const orphanIdCounts = {}; // courseId → { orphanId → nº de alunos }
  const orphanQuizCounts = {}; // courseId → { contentId → nº de alunos }

  for (const courseId of courseIds) {
    const [contentSnap, videosSnap, slidesSnap, quizzesSnap] = await Promise.all([
      db.ref(`courseContent/${courseId}`).get(),
      db.ref(`courseVideos/${courseId}`).get(),
      db.ref(`courseSlides/${courseId}`).get(),
      db.ref(`courseQuizzes/${courseId}`).get(),
    ]);
    const content = contentSnap.val() || {};
    const videos = videosSnap.val() || {};
    const slides = slidesSnap.val() || {};
    const quizzes = quizzesSnap.val() || {};
    const flipped = await readFlippedContent(db, courseId);

    const currentIds = collectCurrentContentIds({
      content,
      videos,
      slides,
      flippedIds: flipped.map((f) => f.id),
    });

    // Itens atuais (para recomputar o agregado). Slides contam como assistidos.
    const currentItems = [];
    const pushItems = (node, isSlide) => {
      Object.entries(node || {}).forEach(([id, item]) => {
        if (item && typeof item === "object") {
          currentItems.push({
            id,
            isSlide: isSlide || item.category === "slide",
            hasQuiz: Object.prototype.hasOwnProperty.call(quizzes, id),
          });
        }
      });
    };
    pushItems(content, false);
    pushItems(videos, false);
    pushItems(slides, true);
    flipped.forEach((f) =>
      currentItems.push({
        id: f.id,
        isSlide: false,
        hasQuiz: Object.prototype.hasOwnProperty.call(quizzes, f.id),
      })
    );

    const usersProgress = progressByCourse[courseId] || {};
    const usersQuiz = quizByCourse[courseId] || {};
    orphanIdCounts[courseId] = {};
    orphanQuizCounts[courseId] = {};

    // Todos os alunos com progresso OU resultado de quiz neste curso.
    const uidsInCourse = new Set([
      ...Object.keys(usersProgress),
      ...Object.keys(usersQuiz),
    ]);

    for (const uid of uidsInCourse) {
      const byId = usersProgress[uid] || {};
      const userQuiz = usersQuiz[uid] || {};

      // 1) Progresso órfão (vídeos assistidos cujo id sumiu)
      const orphans = findOrphanProgress(byId, currentIds);
      for (const o of orphans) {
        orphanRows.push({
          courseId,
          userId: uid,
          orphanId: o.id,
          watched: o.watched,
          percentageWatched: o.percentageWatched,
          quizPassed: o.quizPassed,
        });
        orphanIdCounts[courseId][o.id] =
          (orphanIdCounts[courseId][o.id] || 0) + 1;
      }

      // 1b) Aprovação de quiz órfã (quizResults aprovado cujo id sumiu)
      const orphanQuizzes = findOrphanQuizResults(userQuiz, currentIds);
      for (const oq of orphanQuizzes) {
        orphanQuizRows.push({
          courseId,
          userId: uid,
          orphanKey: oq.key,
          contentId: oq.contentId,
        });
        orphanQuizCounts[courseId][oq.contentId] =
          (orphanQuizCounts[courseId][oq.contentId] || 0) + 1;
      }

      // 2) Divergência de agregado. quizPassedById vem PRIMARIAMENTE de
      // quizResults (o que o app usa), com o espelho videoProgress.quizPassed
      // como reforço.
      const quizPassedById = buildQuizPassedById(userQuiz);
      Object.entries(byId || {}).forEach(([id, node]) => {
        if (node && node.quizPassed === true) quizPassedById[id] = true;
      });
      const recomputed = recomputeAggregate(currentItems, byId, quizPassedById);
      const stored = studentCourses?.[uid]?.[courseId]?.progress;
      if (stored !== undefined) {
        const diff = Math.abs((stored || 0) - recomputed.progress);
        if (diff > 0.5) {
          aggregateRows.push({
            courseId,
            userId: uid,
            aggregateStored: Number((stored || 0).toFixed(2)),
            aggregateRecomputed: Number(recomputed.progress.toFixed(2)),
            completed: recomputed.completed,
            total: recomputed.total,
          });
        }
      }
    }
  }

  // Resumo por curso/id órfão (para o admin montar o mapeamento de recuperação).
  const orphanSummary = [];
  for (const [courseId, counts] of Object.entries(orphanIdCounts)) {
    for (const [orphanId, students] of Object.entries(counts)) {
      orphanSummary.push({ courseId, orphanId, studentsAffected: students });
    }
  }
  orphanSummary.sort((a, b) => b.studentsAffected - a.studentsAffected);

  // Resumo dos quizzes órfãos (mesma ideia, por id de conteúdo).
  const orphanQuizSummary = [];
  for (const [courseId, counts] of Object.entries(orphanQuizCounts)) {
    for (const [contentId, students] of Object.entries(counts)) {
      orphanQuizSummary.push({ courseId, contentId, studentsAffected: students });
    }
  }
  orphanQuizSummary.sort((a, b) => b.studentsAffected - a.studentsAffected);

  const report = {
    generatedAt: new Date().toISOString(),
    mode,
    coursesAudited: courseIds.length,
    totals: {
      orphanRecords: orphanRows.length,
      distinctOrphanIds: orphanSummary.length,
      orphanQuizPasses: orphanQuizRows.length,
      distinctOrphanQuizIds: orphanQuizSummary.length,
      aggregateDivergences: aggregateRows.length,
    },
    orphanSummary,
    orphanRecords: orphanRows,
    orphanQuizSummary,
    orphanQuizPasses: orphanQuizRows,
    aggregateDivergences: aggregateRows,
  };

  const jsonPath = join(outDir, "progress-audit.json");
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  // CSV focado nos órfãos (uma linha por aluno/id órfão).
  const header =
    "courseId,userId,orphanId,watched,percentageWatched,quizPassed,studentsAffectedForId";
  const lines = orphanRows.map((r) =>
    [
      r.courseId,
      r.userId,
      r.orphanId,
      r.watched,
      r.percentageWatched,
      r.quizPassed,
      orphanIdCounts[r.courseId]?.[r.orphanId] || 1,
    ]
      .map(csvEscape)
      .join(",")
  );
  const csvPath = join(outDir, "progress-audit.csv");
  writeFileSync(csvPath, [header, ...lines].join("\n"));

  console.log(`\n📊 Resumo`);
  console.log(`   Cursos auditados:          ${courseIds.length}`);
  console.log(`   Registros de progresso órfão: ${orphanRows.length}`);
  console.log(`   Ids órfãos distintos:      ${orphanSummary.length}`);
  console.log(`   Aprovações de quiz órfãs:  ${orphanQuizRows.length} (${orphanQuizSummary.length} ids)`);
  console.log(`   Divergências de agregado:  ${aggregateRows.length}`);
  console.log(`\n📝 Relatórios:`);
  console.log(`   ${jsonPath}`);
  console.log(`   ${csvPath}`);
  if (orphanSummary.length) {
    console.log(`\nTop ids órfãos (courseId / orphanId / alunos):`);
    orphanSummary.slice(0, 15).forEach((o) =>
      console.log(`   ${o.courseId}  ${o.orphanId}  ${o.studentsAffected}`)
    );
    console.log(
      `\nPara recuperar, monte um CSV "courseId,oldId,newId" (o newId é o id do\n` +
        `conteúdo recadastrado que substitui cada órfão) e rode recoverCourseProgress.mjs.`
    );
  }

  process.exit(0);
};

main().catch((e) => {
  console.error("❌ Falha na auditoria:", e);
  process.exit(1);
});
