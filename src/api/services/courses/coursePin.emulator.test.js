import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref, set, get } from "firebase/database";

/**
 * Teste de integração contra o emulador do Realtime Database.
 *
 * Cobre a regressão que trancava a turma para fora do curso: editar qualquer
 * campo de um curso com PIN reescrevia o PIN.
 *
 *  - `updateCourse` gravava só o `pinHash` e nunca o `encryptedPin`, então o
 *    PIN deixava de ser recuperável para exibição;
 *  - sem conseguir exibir, `fetchCourseDetails` devolvia o texto
 *    "[PIN configurado]" no campo `pin`, o formulário guardava esse texto no
 *    estado e o devolvia no salvamento seguinte — o PIN do curso virava o hash
 *    daquela frase;
 *  - habilitar o PIN em um curso já existente com o campo vazio salvava um PIN
 *    aleatório que nunca era mostrado a ninguém.
 *
 * Precisa do emulador de pé (`npm run firebase-emulate`). Sem ele, os testes são
 * reportados como pulados, não aprovados. Porta configurável via RTDB_EMULATOR_PORT.
 */

const PORT = Number(process.env.RTDB_EMULATOR_PORT || 9000);
const NS = "plataformacodefolio";
const PROFESSOR = "prof_pin_teste";

vi.mock("../../config/firebase", async () => {
  const { initializeApp } = await import("firebase/app");
  const { getDatabase } = await import("firebase/database");
  const porta = Number(process.env.RTDB_EMULATOR_PORT || 9000);
  const app = initializeApp(
    { databaseURL: `http://127.0.0.1:${porta}?ns=plataformacodefolio` },
    "course-pin-emulator-test"
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
      `Testes de integração do PIN pulados — rode 'npm run firebase-emulate'.`
  );
}

const { createCourse, updateCourse, fetchCourseDetails } = await import("./courses");
const { validateCoursePin, hashPin } = await import("./pin");
const { database } = await import("../../config/firebase");

const criarCursoComPin = async (pin) => {
  const { courseId } = await createCourse(
    {
      title: "Curso com PIN",
      description: "Descrição",
      pinEnabled: true,
      pin,
    },
    PROFESSOR
  );
  return courseId;
};

/** Edição típica: o professor mexe no título e não toca no campo do PIN. */
const editarSoOTitulo = (courseId, titulo) =>
  updateCourse(courseId, {
    title: titulo,
    description: "Descrição",
    pinEnabled: true,
  });

describe.runIf(emuladorNoAr)("PIN do curso ao longo da edição", () => {
  let courseId;

  beforeEach(async () => {
    courseId = null;
  });

  it("guarda hash e versão recuperável ao criar", async () => {
    courseId = await criarCursoComPin("1234567");

    const curso = await fetchCourseDetails(courseId);
    expect(curso.pinKnown).toBe(true);
    expect(curso.pin).toBe("1234567");
    expect(await validateCoursePin(courseId, "1234567")).toBe(true);
  });

  it("editar outro campo NÃO altera o PIN", async () => {
    courseId = await criarCursoComPin("1234567");

    await editarSoOTitulo(courseId, "Curso renomeado");

    expect(await validateCoursePin(courseId, "1234567")).toBe(true);
    const curso = await fetchCourseDetails(courseId);
    expect(curso.title).toBe("Curso renomeado");
    expect(curso.pin).toBe("1234567");
    expect(curso.pinKnown).toBe(true);
  });

  it("trocar o PIN invalida o antigo e mantém o novo legível", async () => {
    courseId = await criarCursoComPin("1234567");

    await updateCourse(courseId, {
      title: "Curso com PIN",
      description: "Descrição",
      pinEnabled: true,
      pin: "7654321",
    });

    expect(await validateCoursePin(courseId, "1234567")).toBe(false);
    expect(await validateCoursePin(courseId, "7654321")).toBe(true);

    const curso = await fetchCourseDetails(courseId);
    expect(curso.pin).toBe("7654321");
    expect(curso.pinKnown).toBe(true);
  });

  it("curso antigo (só com hash) não devolve texto no lugar do PIN", async () => {
    courseId = "curso_pin_legado";
    await set(ref(database, `courses/${courseId}`), {
      title: "Curso legado",
      description: "Descrição",
      userId: PROFESSOR,
      pinEnabled: true,
      pinHash: hashPin("9999999", courseId),
    });

    const curso = await fetchCourseDetails(courseId);
    expect(curso.pinKnown).toBe(false);
    expect(curso.pin).toBeUndefined();

    // E editar o título continua preservando o PIN que o professor não vê.
    await editarSoOTitulo(courseId, "Curso legado renomeado");
    expect(await validateCoursePin(courseId, "9999999")).toBe(true);
  });

  it("desligar o PIN não deixa a credencial antiga para trás", async () => {
    courseId = await criarCursoComPin("1234567");

    await updateCourse(courseId, {
      title: "Curso aberto",
      description: "Descrição",
      pinEnabled: false,
    });

    const curso = (await get(ref(database, `courses/${courseId}`))).val();
    expect(curso.pinEnabled).toBe(false);
    expect(curso.pinHash).toBeUndefined();
    expect(curso.encryptedPin).toBeUndefined();
    expect(await validateCoursePin(courseId, "1234567")).toBe(false);
  });
});
