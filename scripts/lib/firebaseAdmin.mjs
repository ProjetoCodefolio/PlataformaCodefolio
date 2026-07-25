// Inicialização do Firebase Admin SDK para os scripts de manutenção.
//
// Dois modos:
//  - EMULADOR (dev/teste): defina FIREBASE_DATABASE_EMULATOR_HOST=127.0.0.1:9000.
//    Nenhuma credencial é necessária.
//  - PRODUÇÃO: defina GOOGLE_APPLICATION_CREDENTIALS apontando para o JSON da
//    conta de serviço (NUNCA versione esse arquivo).
//
// A URL do RTDB e o projectId podem ser sobrescritos por RTDB_URL / GCLOUD_PROJECT.

import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import { readFileSync } from "node:fs";

const PROJECT_ID = process.env.GCLOUD_PROJECT || "plataformacodefolio";
const DATABASE_URL =
  process.env.RTDB_URL ||
  `https://${PROJECT_ID}-default-rtdb.firebaseio.com`;

/**
 * Inicializa o app admin e devolve a instância do Realtime Database.
 * @returns {{ db: import("firebase-admin/database").Database, mode: string }}
 */
export const initAdminDb = () => {
  const usingEmulator = !!process.env.FIREBASE_DATABASE_EMULATOR_HOST;

  let credential;
  if (!usingEmulator) {
    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (credPath) {
      try {
        const json = JSON.parse(readFileSync(credPath, "utf8"));
        credential = cert(json);
      } catch (e) {
        throw new Error(
          `Não foi possível ler GOOGLE_APPLICATION_CREDENTIALS (${credPath}): ${e.message}`
        );
      }
    } else {
      // Tenta credencial padrão do ambiente (gcloud ADC), se houver.
      credential = applicationDefault();
    }
  }

  initializeApp({
    projectId: PROJECT_ID,
    databaseURL: DATABASE_URL,
    ...(credential ? { credential } : {}),
  });

  return {
    db: getDatabase(),
    mode: usingEmulator ? `emulador (${process.env.FIREBASE_DATABASE_EMULATOR_HOST})` : `produção (${DATABASE_URL})`,
  };
};

/**
 * Reúne os ids de vídeos de entrega (sala invertida) de um curso, no formato
 * `flip_{assignmentId}_{submitterKey}` — mesmo id sob o qual o progresso é salvo.
 * @param {import("firebase-admin/database").Database} db
 * @param {string} courseId
 * @returns {Promise<Array<{id:string, title:string, url:string}>>}
 */
export const readFlippedContent = async (db, courseId) => {
  const snap = await db.ref(`assignmentSubmissions/${courseId}`).get();
  if (!snap.exists()) return [];
  const raw = snap.val() || {};
  const out = [];
  for (const [assignmentId, submitters] of Object.entries(raw)) {
    if (!submitters || typeof submitters !== "object") continue;
    for (const [submitterKey, sub] of Object.entries(submitters)) {
      const video = sub?.content?.video;
      if (video && (video.youtubeUrl || video.url)) {
        out.push({
          id: `flip_${assignmentId}_${submitterKey}`,
          title: video.title || "",
          url: video.youtubeUrl || video.url || "",
        });
      }
    }
  }
  return out;
};
