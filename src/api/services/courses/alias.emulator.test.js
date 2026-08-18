import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref, set, get } from "firebase/database";

/**
 * Teste de integração contra o emulador do Realtime Database.
 *
 * `courseAliases` é um índice reverso chaveado PELO apelido, então manter curso
 * e índice em dia é o ponto delicado. Cobre as regressões:
 *
 *  - limpar o apelido deixava /cursos/{antigo} resolvendo para sempre: o bloco
 *    de atualização inteiro estava sob `if (courseData.alias)`, e a exclusão do
 *    curso se guiava pelo campo (já vazio), então o mapeamento nunca saía;
 *  - apelido com caractere inválido vindo da URL montava um caminho inválido no
 *    banco depois que a busca passou a ler a chave direto.
 *
 * Precisa do emulador de pé (`npm run firebase-emulate`). Sem ele, os testes são
 * reportados como pulados, não aprovados. Porta configurável via RTDB_EMULATOR_PORT.
 */

const PORT = Number(process.env.RTDB_EMULATOR_PORT || 9000);
const NS = "plataformacodefolio";
const PROFESSOR = "prof_alias_teste";

vi.mock("../../config/firebase", async () => {
  const { initializeApp } = await import("firebase/app");
  const { getDatabase } = await import("firebase/database");
  const porta = Number(process.env.RTDB_EMULATOR_PORT || 9000);
  const app = initializeApp(
    { databaseURL: `http://127.0.0.1:${porta}?ns=plataformacodefolio` },
    "alias-emulator-test"
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
      `Testes de integração do apelido pulados — rode 'npm run firebase-emulate'.`
  );
}

const { createCourse, updateCourse, deleteCourse } = await import("./courses");
const { getCourseIdByAlias, checkCourseAliasExists } = await import("./alias");
const { database } = await import("../../config/firebase");

const dadosDoCurso = (alias) => ({
  title: "Curso com apelido",
  description: "Descrição",
  alias,
  pinEnabled: false,
});

describe.runIf(emuladorNoAr)("apelido do curso (courseAliases)", () => {
  let courseId;

  beforeEach(async () => {
    // Limpa só as chaves deste teste: apagar o nó `courseAliases` inteiro
    // atropelaria os outros testes de emulador, que rodam em paralelo no
    // mesmo banco.
    for (const apelido of ["redes-2026", "redes-2027", "apelido-orfao"]) {
      await set(ref(database, `courseAliases/${apelido}`), null);
    }
    const criado = await createCourse(dadosDoCurso("redes-2026"), PROFESSOR, "redes-2026");
    courseId = criado.courseId;
  });

  it("resolve o curso pelo apelido", async () => {
    expect(await getCourseIdByAlias("redes-2026")).toEqual({ courseId });
  });

  it("renomear troca o mapeamento e não deixa o antigo para trás", async () => {
    await updateCourse(courseId, dadosDoCurso("redes-2027"));

    expect(await getCourseIdByAlias("redes-2027")).toEqual({ courseId });
    expect(await getCourseIdByAlias("redes-2026")).toEqual({ courseId: null });
  });

  it("limpar o apelido remove o mapeamento", async () => {
    await updateCourse(courseId, dadosDoCurso(""));

    expect(await getCourseIdByAlias("redes-2026")).toEqual({ courseId: null });

    const curso = (await get(ref(database, `courses/${courseId}`))).val();
    expect(curso.alias).toBeUndefined();
  });

  it("excluir o curso remove o mapeamento, mesmo órfão", async () => {
    // Mapeamento órfão deixado por versões anteriores: aponta para o curso, mas
    // não corresponde ao campo `alias` do registro.
    await set(ref(database, "courseAliases/apelido-orfao"), { courseId });

    await deleteCourse(courseId);

    expect(await getCourseIdByAlias("redes-2026")).toEqual({ courseId: null });
    expect(await getCourseIdByAlias("apelido-orfao")).toEqual({ courseId: null });
  });

  it("apelido com caractere inválido na URL não quebra a busca", async () => {
    // '.' e '/' não podem ser chave no Realtime Database: montar o caminho com
    // eles lançaria exceção em vez de responder "curso não encontrado".
    await expect(checkCourseAliasExists("redes.2026")).resolves.toEqual({
      exists: false,
      courseId: null,
    });
    await expect(getCourseIdByAlias("redes/2026")).resolves.toEqual({
      courseId: null,
    });
  });
});
