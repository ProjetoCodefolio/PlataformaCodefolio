// Cron LOCAL das publicações programadas.
//
// Em produção, quem avisa a turma na hora da publicação é o Worker do
// Cloudflare (emailWorker/src/publications.js), de 5 em 5 minutos. No
// `npm run dev` o Worker não está rodando, então este módulo roda o MESMO
// processamento dentro do navegador, a cada minuto, contra o emulador:
//  - o sino é gravado direto no emulador;
//  - o e-mail do quiz sai pelo caminho do app (enqueueNotificationEmail), com
//    as mesmas travas: VITE_FORCE_EMAIL_NOTIFICATIONS e a allowlist de teste.
//
// Só é carregado por main.jsx em dev com emulador; não existe na build.
// Várias abas abertas não duplicam aviso: a reserva por ETag do
// processamento vale aqui também.

import { createDb } from "../../../emailWorker/src/firebaseRest.js";
import { processDuePublications } from "../../../emailWorker/src/publications.js";
import { EMULATOR_DATABASE_URL } from "$api/config/firebase";
import { EMAIL_NOTIFICATIONS_ENABLED } from "$api/services/notifications";
import { enqueueNotificationEmail } from "$api/services/emailService";

const INTERVALO_MS = 60 * 1000;

let iniciado = false;
let rodando = false;

const db = createDb({
  databaseUrl: EMULATOR_DATABASE_URL,
  // O emulador aceita "owner" como administrador, como a conta de serviço do
  // Worker em produção.
  getAuthHeader: async () => "Bearer owner",
});

const enqueueEmail = async (job) => {
  if (!EMAIL_NOTIFICATIONS_ENABLED) return;
  await enqueueNotificationEmail(job);
};

const rodar = async () => {
  if (rodando) return;
  rodando = true;
  try {
    const resumo = await processDuePublications({ db, enqueueEmail });
    if (resumo.notified || resumo.rescheduled || resumo.dropped) {
      console.info("[cron local] publicações programadas:", resumo);
    }
  } catch (error) {
    console.warn("[cron local] falhou:", error);
  } finally {
    rodando = false;
  }
};

export const startLocalPublicationCron = () => {
  if (iniciado) return;
  iniciado = true;
  console.info("[cron local] publicações programadas: verificando a cada minuto.");
  rodar();
  setInterval(rodar, INTERVALO_MS);
};
