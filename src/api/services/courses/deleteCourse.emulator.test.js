import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { ref, get, update } from "firebase/database";

/**
 * Teste de integração contra o emulador do Realtime Database.
 *
 * O Realtime Database não tem deleção em cascata: cada nó que referencia o
 * curso precisa ser listado à mão em deleteCourse, e o que fica de fora vira
 * lixo permanente no banco. Ficavam para trás as configurações de presença, os
 * trabalhos (enunciados, grupos e entregas dos alunos), as preferências e as
 * notificações do curso e os reportes de conteúdo.
 *
 * O teste percorre TODOS os nós que um curso ocupa e, no mesmo passo, verifica
 * que um segundo curso intacto não é atingido — uma cascata larga demais seria
 * pior que o vazamento.
 *
 * Precisa do emulador de pé (`npm run firebase-emulate`). Sem ele, os testes são
 * reportados como pulados, não aprovados. Porta configurável via RTDB_EMULATOR_PORT.
 */

const PORT = Number(process.env.RTDB_EMULATOR_PORT || 9000);
const NS = "plataformacodefolio";

const CURSO = "curso_cascata_teste";
const OUTRO = "curso_cascata_vizinho";
const ALUNO = "aluno_cascata_teste";
const PROFESSOR = "prof_cascata_teste";

vi.mock("../../config/firebase", async () => {
  const { initializeApp } = await import("firebase/app");
  const { getDatabase } = await import("firebase/database");
  const porta = Number(process.env.RTDB_EMULATOR_PORT || 9000);
  const app = initializeApp(
    { databaseURL: `http://127.0.0.1:${porta}?ns=plataformacodefolio` },
    "delete-course-emulator-test"
  );
  return { database: getDatabase(app), auth: {}, analytics: {} };
});

const emuladorNoAr = await (async () => {
  try {
    return (await fetch(`http://127.0.0.1:${PORT}/.json?ns=${NS}`)).ok;
  } catch {
    return false;
  }
})();

if (!emuladorNoAr) {
  console.warn(
    `⚠️  Emulador do RTDB não encontrado em 127.0.0.1:${PORT}. ` +
      `Testes de integração da exclusão de curso pulados — rode 'npm run firebase-emulate'.`
  );
}

const { deleteCourse } = await import("./courses");
const { database } = await import("../../config/firebase");

/** Nós chaveados diretamente pelo id do curso. */
const nosDoCurso = (courseId) => [
  `courses/${courseId}`,
  `courseVideos/${courseId}`,
  `courseContent/${courseId}`,
  `courseQuizzes/${courseId}`,
  `courseSlides/${courseId}`,
  `courseMaterials/${courseId}`,
  `courseAssessments/${courseId}`,
  `courseAdvancedSettings/${courseId}`,
  `courseAttendanceSettings/${courseId}`,
  `courseAssignments/${courseId}`,
  `assignmentGroups/${courseId}`,
  `assignmentSubmissions/${courseId}`,
  `customQuizResults/${courseId}`,
  `liveQuizResults/${courseId}`,
  `openEndedAnswers/${courseId}`,
  `quizGigi/${courseId}`,
];

/** Nós por usuário e por campo que também apontam para o curso. */
const nosLigadosAoCurso = (courseId, sufixo) => [
  `courseAliases/apelido_${sufixo}`,
  `studentCourses/${ALUNO}/${courseId}`,
  `videoProgress/${ALUNO}/${courseId}`,
  `quizResults/${ALUNO}/${courseId}`,
  `users/${PROFESSOR}/coursesTeacher/${courseId}`,
  `notificationPrefs/${ALUNO}/${courseId}`,
  `notifications/${ALUNO}/notif_${sufixo}`,
  `reports/report_${sufixo}`,
];

const semear = async (courseId, sufixo) => {
  const updates = {};
  nosDoCurso(courseId).forEach((caminho) => {
    updates[caminho] = { marcador: sufixo };
  });
  updates[`courses/${courseId}`] = {
    title: `Curso ${sufixo}`,
    userId: PROFESSOR,
    alias: `apelido_${sufixo}`,
  };
  updates[`courseAliases/apelido_${sufixo}`] = { courseId };
  updates[`studentCourses/${ALUNO}/${courseId}`] = { progress: 50 };
  updates[`videoProgress/${ALUNO}/${courseId}`] = { v1: { watched: true } };
  updates[`quizResults/${ALUNO}/${courseId}`] = { q1: { isPassed: true } };
  updates[`users/${PROFESSOR}/coursesTeacher/${courseId}`] = true;
  updates[`notificationPrefs/${ALUNO}/${courseId}`] = { email: false };
  updates[`notifications/${ALUNO}/notif_${sufixo}`] = {
    courseId,
    title: "Novo quiz",
  };
  updates[`reports/report_${sufixo}`] = { courseId, message: "erro no vídeo" };
  await update(ref(database), updates);
};

/**
 * Limpa APENAS os caminhos que este teste ocupa. Apagar os nós raiz
 * (`courses`, `notifications`, ...) atropelaria os outros testes de emulador,
 * que rodam em paralelo no mesmo banco.
 */
const limpar = async () => {
  const updates = {};
  [
    ...nosDoCurso(CURSO),
    ...nosDoCurso(OUTRO),
    ...nosLigadosAoCurso(CURSO, "alvo"),
    ...nosLigadosAoCurso(OUTRO, "vizinho"),
  ].forEach((caminho) => {
    updates[caminho] = null;
  });
  await update(ref(database), updates);
};

const existe = async (caminho) => (await get(ref(database, caminho))).exists();

describe.runIf(emuladorNoAr)("deleteCourse remove todos os rastros do curso", () => {
  beforeEach(async () => {
    await limpar();
    await semear(CURSO, "alvo");
    await semear(OUTRO, "vizinho");
  });

  afterAll(limpar);

  it("apaga todos os nós chaveados pelo curso", async () => {
    await deleteCourse(CURSO);

    for (const caminho of nosDoCurso(CURSO)) {
      expect(await existe(caminho), `sobrou ${caminho}`).toBe(false);
    }
  });

  it("apaga o que aponta para o curso por usuário ou por campo", async () => {
    await deleteCourse(CURSO);

    for (const caminho of nosLigadosAoCurso(CURSO, "alvo")) {
      expect(await existe(caminho), `sobrou ${caminho}`).toBe(false);
    }
  });

  it("não encosta em outro curso", async () => {
    await deleteCourse(CURSO);

    for (const caminho of [
      ...nosDoCurso(OUTRO),
      ...nosLigadosAoCurso(OUTRO, "vizinho"),
    ]) {
      expect(await existe(caminho), `perdeu ${caminho}`).toBe(true);
    }
  });
});
