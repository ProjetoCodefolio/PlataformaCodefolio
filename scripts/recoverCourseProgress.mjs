#!/usr/bin/env node
// Recuperação de progresso órfão: re-vincula o progresso salvo sob um id antigo
// (conteúdo deletado) ao id novo do conteúdo recadastrado que o substitui.
//
// Dirigido por um MAPEAMENTO autorado pelo admin (com base na auditoria), porque
// o nó de progresso órfão não guarda url/título — só o admin sabe qual conteúdo
// novo substitui cada id antigo.
//
// Migra o progresso de vídeo (videoProgress) E a aprovação no quiz (quizResults),
// pois ambos orfanam junto quando o conteúdo é recadastrado. O merge é MONOTÔNICO
// (nunca rebaixa o destino; preserva aprovações). Idempotente.
//
// Uso:
//   node scripts/recoverCourseProgress.mjs --map mapping.csv            # dry-run
//   FIREBASE_DATABASE_EMULATOR_HOST=127.0.0.1:9000 \
//     node scripts/recoverCourseProgress.mjs --map mapping.csv --apply  # aplica
//
// mapping.csv (com ou sem cabeçalho):
//   courseId,oldId,newId
//
// Flags:
//   --map <arquivo>   CSV de mapeamento (obrigatório)
//   --apply           grava as mudanças (sem isto, apenas simula)
//   --cleanup         em --apply, remove o nó órfão (oldId) após migrar
//   --no-aggregate    não recalcula studentCourses.progress dos usuários tocados

import { readFileSync } from "node:fs";
import { initAdminDb, readFlippedContent } from "./lib/firebaseAdmin.mjs";
import {
  collectCurrentContentIds,
  recomputeAggregate,
  mergeProgressNode,
  isWatchedNode,
  mergeQuizResultNode,
  buildQuizPassedById,
} from "../src/api/services/courses/progressAudit.js";

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const getFlag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : null;
};

const mapPath = getFlag("--map");
const apply = has("--apply");
const cleanup = has("--cleanup");
const recalcAggregate = !has("--no-aggregate");

if (!mapPath) {
  console.error("Uso: node scripts/recoverCourseProgress.mjs --map mapping.csv [--apply] [--cleanup]");
  process.exit(1);
}

/** Lê o CSV de mapeamento (courseId,oldId,newId), ignorando cabeçalho opcional. */
const parseMapping = (path) => {
  const text = readFileSync(path, "utf8").trim();
  if (!text) return [];
  return text
    .split(/\r?\n/)
    .map((l) => l.split(",").map((c) => c.trim()))
    .filter((cols) => cols.length >= 3 && cols[0] && cols[1] && cols[2])
    .filter((cols) => cols[0].toLowerCase() !== "courseid") // pula cabeçalho
    .map(([courseId, oldId, newId]) => ({ courseId, oldId, newId }));
};

const main = async () => {
  const { db, mode } = initAdminDb();
  const mapping = parseMapping(mapPath);
  console.log(`🩹 Recuperação de progresso — ${mode}`);
  console.log(`   Modo: ${apply ? "APLICAR (escreve no banco)" : "DRY-RUN (só simula)"}`);
  console.log(`   Mapeamentos: ${mapping.length}\n`);
  if (mapping.length === 0) {
    console.log("Nada a fazer.");
    process.exit(0);
  }

  // Agrupa por curso para reaproveitar leituras de conteúdo.
  const byCourse = {};
  mapping.forEach((m) => (byCourse[m.courseId] ||= []).push(m));

  const updates = {}; // multi-path update (apenas no --apply)
  const touchedUsersByCourse = {}; // courseId → Set(uid)
  let migratedNodes = 0;
  let migratedQuiz = 0;
  let skipped = 0;

  for (const [courseId, maps] of Object.entries(byCourse)) {
    const [videoProgressSnap, quizResultsSnap, contentSnap, videosSnap, slidesSnap, quizzesSnap] =
      await Promise.all([
        db.ref(`videoProgress`).get(),
        db.ref(`quizResults`).get(),
        db.ref(`courseContent/${courseId}`).get(),
        db.ref(`courseVideos/${courseId}`).get(),
        db.ref(`courseSlides/${courseId}`).get(),
        db.ref(`courseQuizzes/${courseId}`).get(),
      ]);
    const videoProgress = videoProgressSnap.val() || {};
    const quizResults = quizResultsSnap.val() || {};
    const flipped = await readFlippedContent(db, courseId);
    const currentIds = collectCurrentContentIds({
      content: contentSnap.val() || {},
      videos: videosSnap.val() || {},
      slides: slidesSnap.val() || {},
      flippedIds: flipped.map((f) => f.id),
    });

    touchedUsersByCourse[courseId] = new Set();

    for (const { oldId, newId } of maps) {
      if (!currentIds.has(newId)) {
        console.warn(
          `⚠️  [${courseId}] newId "${newId}" não é um conteúdo atual do curso — pulando (verifique o mapeamento).`
        );
        continue;
      }
      // Todos os usuários com progresso OU resultado de quiz órfão neste oldId.
      const uidsToCheck = new Set([
        ...Object.keys(videoProgress),
        ...Object.keys(quizResults),
      ]);

      for (const uid of uidsToCheck) {
        const byCourseNode = videoProgress[uid];

        // (a) Progresso de vídeo assistido.
        const source = byCourseNode?.[courseId]?.[oldId];
        if (source && isWatchedNode(source)) {
          const target = byCourseNode?.[courseId]?.[newId];
          const merged = mergeProgressNode(source, target);
          if (!merged) {
            skipped += 1;
          } else {
            migratedNodes += 1;
            touchedUsersByCourse[courseId].add(uid);
            console.log(
              `   [${courseId}] ${uid}: ${oldId} → ${newId}  ` +
                `(pct ${merged.percentageWatched}, watched ${merged.watched}` +
                `${merged.quizPassed ? ", quizPassed" : ""})`
            );
            if (apply) {
              updates[`videoProgress/${uid}/${courseId}/${newId}`] = {
                ...(target && typeof target === "object" ? target : {}),
                ...merged,
                videoId: newId,
              };
              if (cleanup) {
                updates[`videoProgress/${uid}/${courseId}/${oldId}`] = null;
              }
              // Reflete o merge em memória para o recálculo do agregado abaixo.
              ((videoProgress[uid] ||= {})[courseId] ||= {})[newId] = {
                ...(target || {}),
                ...merged,
              };
            }
          }
        }

        // (b) Aprovação de quiz. A chave pode ter prefixo `slide_` (slide legado);
        // migramos preservando o prefixo do destino correspondente.
        const userQuiz = quizResults[uid]?.[courseId] || {};
        for (const prefix of ["", "slide_"]) {
          const srcKey = `${prefix}${oldId}`;
          const tgtKey = `${prefix}${newId}`;
          const qSource = userQuiz[srcKey];
          const qTarget = userQuiz[tgtKey];
          const qMerged = mergeQuizResultNode(qSource, qTarget);
          if (!qMerged) continue;
          migratedQuiz += 1;
          touchedUsersByCourse[courseId].add(uid);
          console.log(`   [${courseId}] ${uid}: quiz ${srcKey} → ${tgtKey} (aprovado)`);
          if (apply) {
            updates[`quizResults/${uid}/${courseId}/${tgtKey}`] = qMerged;
            if (cleanup) {
              updates[`quizResults/${uid}/${courseId}/${srcKey}`] = null;
            }
            // Reflete em memória para o recálculo do agregado.
            ((quizResults[uid] ||= {})[courseId] ||= {})[tgtKey] = qMerged;
          }
        }
      }
    }

    // Recalcula o agregado dos usuários tocados neste curso (só em --apply).
    if (apply && recalcAggregate && touchedUsersByCourse[courseId].size > 0) {
      const quizzes = quizzesSnap.val() || {};
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

      for (const uid of touchedUsersByCourse[courseId]) {
        const byId = videoProgress[uid]?.[courseId] || {};
        // quizPassedById vem PRIMARIAMENTE de quizResults (o que o app usa),
        // já com as migrações refletidas em memória; o espelho videoProgress
        // .quizPassed entra como reforço.
        const quizPassedById = buildQuizPassedById(quizResults[uid]?.[courseId] || {});
        Object.entries(byId).forEach(([id, node]) => {
          if (node && node.quizPassed === true) quizPassedById[id] = true;
        });
        const { progress } = recomputeAggregate(currentItems, byId, quizPassedById);
        updates[`studentCourses/${uid}/${courseId}/progress`] = progress;
        updates[`studentCourses/${uid}/${courseId}/status`] =
          progress >= 100 ? "completed" : "in_progress";
        updates[`studentCourses/${uid}/${courseId}/lastUpdated`] =
          new Date().toISOString();
      }
    }
  }

  console.log(
    `\n📊 ${migratedNodes} progresso(s) e ${migratedQuiz} aprovação(ões) de quiz a migrar, ${skipped} já cobertos (nada a fazer).`
  );

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
  console.error("❌ Falha na recuperação:", e);
  process.exit(1);
});
