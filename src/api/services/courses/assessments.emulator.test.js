import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref, set, get } from "firebase/database";

/**
 * Teste de integração das notas e do feedback, contra o emulador.
 *
 * A armadilha que este teste existe para prender: nota e feedback são vizinhos
 * em `courseAssessments/{curso}/{avaliacao}/grades/{aluno}`, mas são escritos em
 * momentos diferentes e por telas diferentes. Enquanto `assignGrade` usava
 * `set()`, corrigir a nota de um aluno apagava em silêncio o texto que o
 * professor tinha escrito para ele — e o mesmo valia para uma importação de
 * planilha.
 *
 * O que está sendo protegido:
 *  - regravar a nota preserva o feedback;
 *  - gravar o feedback preserva a nota;
 *  - importar notas em lote preserva o feedback de todo mundo;
 *  - o feedback de grupo chega igual a todos os integrantes;
 *  - texto vazio apaga o feedback (é como o professor desfaz um comentário).
 *
 * Precisa do emulador de pé (`npm run firebase-emulate`). Sem ele, os testes são
 * reportados como pulados, não aprovados. Porta configurável via RTDB_EMULATOR_PORT.
 */

const PORT = Number(process.env.RTDB_EMULATOR_PORT || 9000);
const NS = "plataformacodefolio";

const CURSO = "curso_notas_feedback";
const AVALIACAO = "trabalho1";
const ANA = "aluna_ana";
const BRUNO = "aluno_bruno";
const CARLA = "aluna_carla";

vi.mock("$api/config/firebase", async () => {
  const { initializeApp } = await import("firebase/app");
  const { getDatabase } = await import("firebase/database");
  const porta = Number(process.env.RTDB_EMULATOR_PORT || 9000);
  const app = initializeApp(
    { databaseURL: `http://127.0.0.1:${porta}?ns=plataformacodefolio` },
    "assessments-emulator-test"
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
      `Testes de notas e feedback pulados — rode 'npm run firebase-emulate'.`
  );
}

const { assignGrade, assignGradesBatch, assignFeedback, getAssessmentGrades } =
  await import("./assessments");
const { database } = await import("$api/config/firebase");

const notaDe = async (studentId) =>
  (
    await get(
      ref(
        database,
        `courseAssessments/${CURSO}/${AVALIACAO}/grades/${studentId}`
      )
    )
  ).val();

describe.runIf(emuladorNoAr)("notas e feedback de uma avaliação", () => {
  beforeEach(async () => {
    await set(ref(database, `courseAssessments/${CURSO}`), null);
    await set(ref(database, `courseAssessments/${CURSO}/${AVALIACAO}`), {
      name: "Trabalho 1",
      percentage: 40,
    });
  });

  it("a nota e o feedback convivem no mesmo registro", async () => {
    await assignGrade(CURSO, AVALIACAO, ANA, 8);
    await assignFeedback(CURSO, AVALIACAO, [ANA], "Boa fundamentação teórica.");

    const registro = await notaDe(ANA);
    expect(registro.grade).toBe(8);
    expect(registro.feedback).toBe("Boa fundamentação teórica.");
  });

  it("corrigir a nota NÃO apaga o feedback", async () => {
    await assignGrade(CURSO, AVALIACAO, ANA, 8);
    await assignFeedback(CURSO, AVALIACAO, [ANA], "Boa fundamentação teórica.");

    await assignGrade(CURSO, AVALIACAO, ANA, 9);

    const registro = await notaDe(ANA);
    expect(registro.grade).toBe(9);
    expect(registro.feedback).toBe("Boa fundamentação teórica.");
  });

  it("gravar o feedback NÃO apaga a nota", async () => {
    await assignGrade(CURSO, AVALIACAO, ANA, 8);
    await assignFeedback(CURSO, AVALIACAO, [ANA], "Revisar as referências.");

    expect((await notaDe(ANA)).grade).toBe(8);
  });

  it("importar notas em lote NÃO apaga o feedback de ninguém", async () => {
    await assignFeedback(CURSO, AVALIACAO, [ANA, BRUNO], "Entrega do grupo 1.");

    await assignGradesBatch(CURSO, [
      { assessmentId: AVALIACAO, userId: ANA, newGrade: 7 },
      { assessmentId: AVALIACAO, userId: BRUNO, newGrade: 7 },
    ]);

    expect((await notaDe(ANA)).feedback).toBe("Entrega do grupo 1.");
    expect((await notaDe(BRUNO)).feedback).toBe("Entrega do grupo 1.");
    expect((await notaDe(ANA)).grade).toBe(7);
  });

  it("o feedback do grupo chega igual a todos os integrantes", async () => {
    await assignFeedback(
      CURSO,
      AVALIACAO,
      [ANA, BRUNO, CARLA],
      "O recorte do problema ficou claro; falta discutir os resultados."
    );

    const textos = await Promise.all(
      [ANA, BRUNO, CARLA].map(async (uid) => (await notaDe(uid)).feedback)
    );

    expect(new Set(textos).size).toBe(1);
    expect(textos[0]).toMatch(/recorte do problema/);
  });

  it("texto vazio apaga o feedback e deixa a nota de pé", async () => {
    await assignGrade(CURSO, AVALIACAO, ANA, 8);
    await assignFeedback(CURSO, AVALIACAO, [ANA], "Comentário a remover.");

    await assignFeedback(CURSO, AVALIACAO, [ANA], "   ");

    const registro = await notaDe(ANA);
    expect(registro.feedback).toBeUndefined();
    expect(registro.grade).toBe(8);
  });

  it("o feedback chega ao aluno junto com a nota", async () => {
    await assignGrade(CURSO, AVALIACAO, ANA, 8);
    await assignFeedback(CURSO, AVALIACAO, [ANA], "Muito bem escrito.");

    const notas = await getAssessmentGrades(CURSO, AVALIACAO);
    const daAna = notas.find((n) => n.studentId === ANA);

    expect(daAna.grade).toBe(8);
    expect(daAna.feedback).toBe("Muito bem escrito.");
  });

  it("recusa feedback sem nenhum aluno", async () => {
    await expect(
      assignFeedback(CURSO, AVALIACAO, [], "texto")
    ).rejects.toThrow(/ao menos um estudante/);
  });
});
