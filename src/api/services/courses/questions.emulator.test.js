import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref, set, get } from "firebase/database";

/**
 * Teste de integração das dúvidas dos alunos contra o emulador do RTDB.
 *
 * O que importa aqui é o que só aparece com banco de verdade:
 *
 *  - a dúvida guarda o TÍTULO do conteúdo, e não só o id: o vídeo pode ser
 *    excluído depois (a exclusão de conteúdo não cascateia para as dúvidas) e a
 *    aba do professor não pode virar uma lista de "conteúdo desconhecido";
 *  - excluir o curso leva as dúvidas junto — sem isso o nó fica órfão, como já
 *    aconteceu com `courseAliases`;
 *  - marcar como discutida NÃO apaga a dúvida: ela sai da apresentação mas
 *    continua registrada na aba;
 *  - o observador entrega a dúvida nova SEM ninguém reler o nó — é o que faz a
 *    apresentação em aula funcionar ao vivo, e só um banco de verdade prova.
 *
 * Precisa do emulador de pé (`npm run firebase-emulate`). Sem ele, os testes são
 * reportados como pulados, não aprovados. Porta configurável via RTDB_EMULATOR_PORT.
 */

const PORT = Number(process.env.RTDB_EMULATOR_PORT || 9000);
const NS = "plataformacodefolio";
const PROFESSOR = "prof_duvidas_teste";
const ALUNO = {
  userId: "aluno_duvidas_teste",
  firstName: "Maria",
  lastName: "Silva",
  photoURL: "",
};

vi.mock("../../config/firebase", async () => {
  const { initializeApp } = await import("firebase/app");
  const { getDatabase } = await import("firebase/database");
  const porta = Number(process.env.RTDB_EMULATOR_PORT || 9000);
  const app = initializeApp(
    { databaseURL: `http://127.0.0.1:${porta}?ns=plataformacodefolio` },
    "questions-emulator-test"
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
      `Testes de integração das dúvidas pulados — rode 'npm run firebase-emulate'.`
  );
}

const { createCourse, deleteCourse } = await import("./courses");
const {
  addCourseQuestion,
  fetchCourseQuestions,
  fetchUserCourseQuestions,
  setQuestionDiscussed,
  deleteCourseQuestion,
  observeCourseQuestions,
} = await import("./questions");
const { database } = await import("../../config/firebase");

describe.runIf(emuladorNoAr)("dúvidas do curso (courseQuestions)", () => {
  let courseId;

  beforeEach(async () => {
    const criado = await createCourse(
      { title: "Curso com dúvidas", description: "Descrição", pinEnabled: false },
      PROFESSOR
    );
    courseId = criado.courseId;
  });

  it("registra a dúvida com autor e título do conteúdo", async () => {
    await addCourseQuestion(
      courseId,
      { contentId: "aula1", contentTitle: "Aula 1 - Herança", text: "  Como funciona?  " },
      ALUNO
    );

    const [duvida] = await fetchCourseQuestions(courseId);
    expect(duvida.contentId).toBe("aula1");
    expect(duvida.contentTitle).toBe("Aula 1 - Herança");
    expect(duvida.text).toBe("Como funciona?");
    expect(duvida.userId).toBe(ALUNO.userId);
    expect(duvida.userName).toBe("Maria Silva");
    expect(duvida.discussed).toBe(false);
  });

  it("mantém o título do conteúdo mesmo depois de o vídeo ser excluído", async () => {
    await set(ref(database, `courseContent/${courseId}/aula1`), {
      category: "video",
      title: "Aula 1 - Herança",
      url: "https://youtu.be/abc",
      order: 0,
    });
    await addCourseQuestion(
      courseId,
      { contentId: "aula1", contentTitle: "Aula 1 - Herança", text: "Como funciona?" },
      ALUNO
    );

    await set(ref(database, `courseContent/${courseId}/aula1`), null);

    const [duvida] = await fetchCourseQuestions(courseId);
    expect(duvida.contentTitle).toBe("Aula 1 - Herança");
  });

  it("lista as mais recentes primeiro", async () => {
    await addCourseQuestion(
      courseId,
      { contentId: "aula1", contentTitle: "Aula 1", text: "Primeira" },
      ALUNO
    );
    // O carimbo é em milissegundos: sem a espera as duas dúvidas empatariam e a
    // ordenação ficaria indefinida.
    await new Promise((resolve) => setTimeout(resolve, 5));
    await addCourseQuestion(
      courseId,
      { contentId: "aula1", contentTitle: "Aula 1", text: "Segunda" },
      ALUNO
    );

    const duvidas = await fetchCourseQuestions(courseId);
    expect(duvidas.map((d) => d.text)).toEqual(["Segunda", "Primeira"]);
  });

  it("marcar como discutida preserva o registro", async () => {
    const criada = await addCourseQuestion(
      courseId,
      { contentId: "aula1", contentTitle: "Aula 1", text: "Como funciona?" },
      ALUNO
    );

    await setQuestionDiscussed(courseId, criada.id, true);

    const [duvida] = await fetchCourseQuestions(courseId);
    expect(duvida.id).toBe(criada.id);
    expect(duvida.discussed).toBe(true);
    expect(duvida.discussedAt).toBeTruthy();
    expect(duvida.text).toBe("Como funciona?");
  });

  it("separa as dúvidas de cada aluno", async () => {
    await addCourseQuestion(
      courseId,
      { contentId: "aula1", contentTitle: "Aula 1", text: "Da Maria" },
      ALUNO
    );
    await addCourseQuestion(
      courseId,
      { contentId: "aula1", contentTitle: "Aula 1", text: "Do João" },
      { userId: "outro_aluno", firstName: "João", lastName: "Souza" }
    );

    const daMaria = await fetchUserCourseQuestions(courseId, ALUNO.userId);
    expect(daMaria.map((d) => d.text)).toEqual(["Da Maria"]);
  });

  it("exclui uma dúvida sem levar as demais", async () => {
    const primeira = await addCourseQuestion(
      courseId,
      { contentId: "aula1", contentTitle: "Aula 1", text: "Primeira" },
      ALUNO
    );
    await addCourseQuestion(
      courseId,
      { contentId: "aula1", contentTitle: "Aula 1", text: "Segunda" },
      ALUNO
    );

    await deleteCourseQuestion(courseId, primeira.id);

    const duvidas = await fetchCourseQuestions(courseId);
    expect(duvidas.map((d) => d.text)).toEqual(["Segunda"]);
  });

  it("entrega ao vivo a dúvida registrada depois da assinatura", async () => {
    const recebidas = [];
    // Cada emissão do observador é guardada: o teste espera pela emissão que
    // contém a dúvida nova, sem supor quantas vieram antes.
    const esperarPor = (texto) =>
      new Promise((resolve, reject) => {
        const prazo = setTimeout(
          () => reject(new Error(`O observador não entregou "${texto}"`)),
          5000
        );
        const conferir = () => {
          const emissao = recebidas.find((lista) =>
            lista.some((duvida) => duvida.text === texto)
          );
          if (emissao) {
            clearTimeout(prazo);
            resolve(emissao);
            return;
          }
          setTimeout(conferir, 25);
        };
        conferir();
      });

    const encerrar = observeCourseQuestions(courseId, (lista) => recebidas.push(lista));

    // Curso sem nenhuma dúvida: a primeira emissão é lista vazia, não erro.
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(recebidas[0]).toEqual([]);

    await addCourseQuestion(
      courseId,
      { contentId: "aula1", contentTitle: "Aula 1", text: "Chegou durante a aula" },
      ALUNO
    );

    const comADuvida = await esperarPor("Chegou durante a aula");
    expect(comADuvida).toHaveLength(1);
    expect(comADuvida[0].userName).toBe("Maria Silva");
    expect(comADuvida[0].discussed).toBe(false);

    // Encerrada a assinatura, o que acontecer no banco não chega mais à tela.
    encerrar();
    const emissoesAteAqui = recebidas.length;
    await addCourseQuestion(
      courseId,
      { contentId: "aula1", contentTitle: "Aula 1", text: "Depois de fechar a tela" },
      ALUNO
    );
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(recebidas).toHaveLength(emissoesAteAqui);
  });

  it("entrega ao vivo a mudança de situação da dúvida", async () => {
    const criada = await addCourseQuestion(
      courseId,
      { contentId: "aula1", contentTitle: "Aula 1", text: "Como funciona?" },
      ALUNO
    );

    const recebidas = [];
    const encerrar = observeCourseQuestions(courseId, (lista) => recebidas.push(lista));

    await setQuestionDiscussed(courseId, criada.id, true);

    await new Promise((resolve) => setTimeout(resolve, 500));
    encerrar();

    const ultima = recebidas[recebidas.length - 1];
    expect(ultima[0].discussed).toBe(true);
  });

  it("recusa dúvida sem texto ou sem conteúdo escolhido", async () => {
    await expect(
      addCourseQuestion(courseId, { contentId: "aula1", contentTitle: "Aula 1", text: "   " }, ALUNO)
    ).rejects.toThrow();

    await expect(
      addCourseQuestion(courseId, { contentTitle: "Aula 1", text: "Sem conteúdo" }, ALUNO)
    ).rejects.toThrow();
  });

  it("excluir o curso leva as dúvidas junto", async () => {
    await addCourseQuestion(
      courseId,
      { contentId: "aula1", contentTitle: "Aula 1", text: "Como funciona?" },
      ALUNO
    );

    await deleteCourse(courseId);

    const restante = await get(ref(database, `courseQuestions/${courseId}`));
    expect(restante.exists()).toBe(false);
  });
});
