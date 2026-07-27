#!/usr/bin/env node
// Reparo dos resultados de quiz FANTASMA — tentativas consumidas sem que o
// aluno tenha respondido nada.
//
// Causa: até a correção, o efeito que atualizava as tentativas ao FECHAR a tela
// do quiz chamava `processQuizCompletion(true, ...)` só para aproveitar o
// retorno com a lista de tentativas. Aquela função ESCREVE, então abrir o quiz
// e sair (um clique errado, voltar para o vídeo, abrir um slide) gravava:
//
//   quizResults/{uid}/{courseId}/{key}  = { isPassed: true, attemptCount: 1, ... }
//   videoProgress/{uid}/{courseId}/{id} = { watched: true, percentageWatched: 100,
//                                           watchedTimeInSeconds: 0, quizPassed: true }
//
// Efeitos: o aluno perdia a tentativa ("Limite Atingido"), aparecia aprovado
// com nota 0 no relatório, e ganhava progresso/presença que não teve.
//
// Este script remove esses registros. Um resultado só é considerado fantasma
// quando NÃO tem nenhum vestígio de submissão (sem nota, sem respostas, sem
// isComplete/submittedAt) — nota zero legítima nunca é tocada.
//
// Uso:
//   # dry-run (não escreve nada) — comece SEMPRE por aqui
//   GOOGLE_APPLICATION_CREDENTIALS=./sa.json node scripts/repairPhantomQuizResults.mjs
//   # aplicar
//   GOOGLE_APPLICATION_CREDENTIALS=./sa.json node scripts/repairPhantomQuizResults.mjs --apply
//   # no emulador
//   FIREBASE_DATABASE_EMULATOR_HOST=127.0.0.1:9000 node scripts/repairPhantomQuizResults.mjs --apply
//
// Flags:
//   --course <id>     restringe a um curso
//   --user <uid>      restringe a um aluno
//   --apply           grava as mudanças (sem isto, apenas simula)
//   --reset-watched   também desfaz o "assistido" forjado (100% com 0s de vídeo)
//   --no-aggregate    não recalcula studentCourses.progress dos alunos tocados
//   --out <dir>       diretório do relatório CSV (default: diretório atual)

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { initAdminDb, readFlippedContent } from "./lib/firebaseAdmin.mjs";
import {
  findPhantomQuizResults,
  isPhantomQuizResult,
  isPhantomWatchedNode,
  isQuizPassedResult,
  normalizeQuizResultId,
  recomputeAggregate,
  buildQuizPassedById,
} from "../src/api/services/courses/progressAudit.js";

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const getFlag = (name, def = null) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};

const onlyCourse = getFlag("--course");
const onlyUser = getFlag("--user");
const apply = has("--apply");
const resetWatched = has("--reset-watched");
const recalcAggregate = !has("--no-aggregate");
const outDir = getFlag("--out", process.cwd());

const csvEscape = (v) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const main = async () => {
  const { db, mode } = initAdminDb();
  console.log(`🩹 Reparo de tentativas fantasma — ${mode}`);
  console.log(`   Modo: ${apply ? "APLICAR (escreve no banco)" : "DRY-RUN (só simula)"}`);
  if (onlyCourse) console.log(`   Curso: ${onlyCourse}`);
  if (onlyUser) console.log(`   Aluno: ${onlyUser}`);
  console.log(`   Assistido forjado: ${resetWatched ? "também será desfeito" : "mantido (use --reset-watched)"}\n`);

  const [quizResultsSnap, videoProgressSnap] = await Promise.all([
    db.ref("quizResults").get(),
    db.ref("videoProgress").get(),
  ]);
  const quizResults = quizResultsSnap.val() || {};
  const videoProgress = videoProgressSnap.val() || {};

  const updates = {}; // multi-path update (só usado no --apply)
  const rows = []; // relatório
  const touchedUsersByCourse = {}; // courseId → Set(uid)
  let phantomCount = 0;
  let clearedQuizPassed = 0;
  let clearedWatched = 0;

  for (const [uid, byCourse] of Object.entries(quizResults)) {
    if (onlyUser && uid !== onlyUser) continue;
    if (!byCourse || typeof byCourse !== "object") continue;

    for (const [courseId, byKey] of Object.entries(byCourse)) {
      if (onlyCourse && courseId !== onlyCourse) continue;
      if (!byKey || typeof byKey !== "object") continue;

      const phantoms = findPhantomQuizResults(byKey);
      if (phantoms.length === 0) continue;

      for (const { key, contentId, attemptCount, passed } of phantoms) {
        phantomCount += 1;
        (touchedUsersByCourse[courseId] ||= new Set()).add(uid);

        // O espelho videoProgress.quizPassed só é limpo se, tirados os
        // fantasmas, NÃO sobrar nenhuma aprovação real para este conteúdo
        // (o aluno pode ter passado de verdade numa outra chave do mesmo id).
        const aindaAprovado = Object.entries(byKey).some(
          ([k, node]) =>
            normalizeQuizResultId(k) === contentId &&
            !isPhantomQuizResult(node) &&
            isQuizPassedResult(node)
        );

        const progressNode = videoProgress?.[uid]?.[courseId]?.[contentId];
        const limpaQuizPassed = !aindaAprovado && progressNode?.quizPassed === true;
        const desfazAssistido =
          resetWatched && !aindaAprovado && isPhantomWatchedNode(progressNode);

        if (limpaQuizPassed) clearedQuizPassed += 1;
        if (desfazAssistido) clearedWatched += 1;

        console.log(
          `   [${courseId}] ${uid}: quiz "${key}" fantasma ` +
            `(tentativas devolvidas: ${attemptCount || 1}${passed ? ", aprovação forjada" : ""})` +
            `${limpaQuizPassed ? " + quizPassed" : ""}` +
            `${desfazAssistido ? " + assistido forjado" : ""}`
        );

        rows.push({
          courseId,
          userId: uid,
          quizKey: key,
          contentId,
          attemptsRestored: attemptCount || 1,
          forgedPass: passed,
          clearedQuizPassed: limpaQuizPassed,
          clearedWatched: desfazAssistido,
        });

        if (apply) {
          updates[`quizResults/${uid}/${courseId}/${key}`] = null;
          delete byKey[key]; // reflete em memória para o recálculo do agregado

          if (limpaQuizPassed) {
            updates[`videoProgress/${uid}/${courseId}/${contentId}/quizPassed`] = null;
            delete videoProgress[uid][courseId][contentId].quizPassed;
          }
          if (desfazAssistido) {
            const path = `videoProgress/${uid}/${courseId}/${contentId}`;
            updates[`${path}/watched`] = false;
            updates[`${path}/completed`] = false;
            updates[`${path}/percentageWatched`] = 0;
            Object.assign(videoProgress[uid][courseId][contentId], {
              watched: false,
              completed: false,
              percentageWatched: 0,
            });
          }
        }
      }
    }
  }

  // Recalcula o agregado dos alunos tocados (o progresso do curso pode cair,
  // já que aprovações/assistidos forjados deixaram de contar).
  if (apply && recalcAggregate) {
    for (const [courseId, uids] of Object.entries(touchedUsersByCourse)) {
      const [contentSnap, videosSnap, slidesSnap, quizzesSnap] = await Promise.all([
        db.ref(`courseContent/${courseId}`).get(),
        db.ref(`courseVideos/${courseId}`).get(),
        db.ref(`courseSlides/${courseId}`).get(),
        db.ref(`courseQuizzes/${courseId}`).get(),
      ]);
      const quizzes = quizzesSnap.val() || {};
      const flipped = await readFlippedContent(db, courseId);

      const currentItems = [];
      const pushItems = (node, isSlide) =>
        Object.entries(node || {}).forEach(([id, item]) => {
          if (item && typeof item === "object") {
            currentItems.push({
              id,
              isSlide: isSlide || item.category === "slide",
              hasQuiz: Object.prototype.hasOwnProperty.call(quizzes, id),
            });
          }
        });
      pushItems(contentSnap.val() || {}, false);
      pushItems(videosSnap.val() || {}, false);
      pushItems(slidesSnap.val() || {}, true);
      flipped.forEach((f) =>
        currentItems.push({
          id: f.id,
          isSlide: false,
          hasQuiz: Object.prototype.hasOwnProperty.call(quizzes, f.id),
        })
      );
      for (const uid of uids) {
        const byId = videoProgress?.[uid]?.[courseId] || {};
        // A aprovação vem PRIMARIAMENTE de quizResults (já sem os fantasmas);
        // o espelho videoProgress.quizPassed entra como reforço.
        const quizPassedById = buildQuizPassedById(quizResults?.[uid]?.[courseId] || {});
        Object.entries(byId).forEach(([id, node]) => {
          if (node && node.quizPassed === true) quizPassedById[id] = true;
        });
        const { progress } = recomputeAggregate(currentItems, byId, quizPassedById);
        updates[`studentCourses/${uid}/${courseId}/progress`] = progress;
        updates[`studentCourses/${uid}/${courseId}/status`] =
          progress >= 100 ? "completed" : "in_progress";
        updates[`studentCourses/${uid}/${courseId}/lastUpdated`] = new Date().toISOString();
      }
    }
  }

  const alunosAfetados = new Set(rows.map((r) => `${r.courseId}/${r.userId}`)).size;
  console.log(
    `\n📊 ${phantomCount} resultado(s) fantasma em ${alunosAfetados} aluno(s)/curso(s). ` +
      `${clearedQuizPassed} aprovação(ões) forjada(s) a limpar, ` +
      `${clearedWatched} "assistido" forjado(s) a desfazer.`
  );

  if (rows.length > 0) {
    const header = [
      "courseId",
      "userId",
      "quizKey",
      "contentId",
      "attemptsRestored",
      "forgedPass",
      "clearedQuizPassed",
      "clearedWatched",
    ];
    const csv = [
      header.join(","),
      ...rows.map((r) => header.map((h) => csvEscape(r[h])).join(",")),
    ].join("\n");
    const csvPath = join(outDir, "phantom-quiz-repair.csv");
    writeFileSync(csvPath, csv, "utf8");
    console.log(`📄 Relatório: ${csvPath}`);
  }

  if (!apply) {
    console.log("\n(DRY-RUN) Nada foi escrito. Rode de novo com --apply para aplicar.");
    process.exit(0);
  }

  if (Object.keys(updates).length === 0) {
    console.log("Nada a gravar.");
    process.exit(0);
  }

  await db.ref().update(updates);
  console.log(`\n✅ Aplicado. ${Object.keys(updates).length} caminho(s) atualizado(s).`);
  process.exit(0);
};

main().catch((e) => {
  console.error("❌ Falha no reparo:", e);
  process.exit(1);
});
