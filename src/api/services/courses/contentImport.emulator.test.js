import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref, set, get } from "firebase/database";

/**
 * Teste de integração da importação de CONTEÚDO, contra o emulador.
 *
 * O que está sendo protegido:
 *  - o conteúdo importado ANEXA ao fim da ordem global, sem reindexar o que já
 *    estava lá — a lista que o professor arrastou à mão não pode embaralhar;
 *  - o quiz que vem junto se prende ao ID NOVO do destino, não ao id de origem;
 *  - trazer o quiz é escolha por item: quem não pediu chega sem questionário;
 *  - conteúdo legado (courseVideos/courseSlides da origem) também é importável,
 *    e chega na collection nova;
 *  - um item com URL inválida é pulado sem derrubar o resto da seleção;
 *  - vídeo de entrega de aluno não aparece na lista de origem.
 *
 * Precisa do emulador de pé (`npm run firebase-emulate`). Sem ele, os testes são
 * reportados como pulados, não aprovados. Porta configurável via RTDB_EMULATOR_PORT.
 */

const PORT = Number(process.env.RTDB_EMULATOR_PORT || 9000);
const NS = "plataformacodefolio";

const ORIGEM = "curso_origem_conteudo";
const DESTINO = "curso_destino_conteudo";

vi.mock("../../config/firebase", async () => {
  const { initializeApp } = await import("firebase/app");
  const { getDatabase } = await import("firebase/database");
  const porta = Number(process.env.RTDB_EMULATOR_PORT || 9000);
  const app = initializeApp(
    { databaseURL: `http://127.0.0.1:${porta}?ns=plataformacodefolio` },
    "content-import-emulator-test"
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
      `Testes de importação de conteúdo pulados — rode 'npm run firebase-emulate'.`
  );
}

const { fetchImportableContent, importContentFromCourse } = await import(
  "./contentImport"
);
const { database } = await import("../../config/firebase");

const quizDeOrigem = {
  videoId: "aula1",
  courseId: ORIGEM,
  minPercentage: 70,
  questions: [
    {
      id: "questao-original-1",
      question: "O que é recursão?",
      questionType: "multiple-choice",
      options: ["A", "B"],
      correctOption: 0,
    },
  ],
};

const limpar = async () => {
  for (const no of [
    "courseContent",
    "courseVideos",
    "courseSlides",
    "courseQuizzes",
  ]) {
    await set(ref(database, `${no}/${ORIGEM}`), null);
    await set(ref(database, `${no}/${DESTINO}`), null);
  }
  await set(ref(database, `assignmentSubmissions/${ORIGEM}`), null);
};

describe.runIf(emuladorNoAr)("importação de conteúdo entre cursos", () => {
  beforeEach(async () => {
    await limpar();

    // ORIGEM: dois itens na collection nova (um com quiz) e um vídeo legado.
    await set(ref(database, `courseContent/${ORIGEM}/aula1`), {
      category: "video",
      title: "Aula 1 — Recursão",
      url: "https://www.youtube.com/watch?v=aaaaaaaaaaa",
      description: "Introdução",
      requiresPrevious: true,
      order: 0,
    });
    await set(ref(database, `courseContent/${ORIGEM}/slide1`), {
      category: "slide",
      title: "Slides da Aula 1",
      url: "https://docs.google.com/presentation/d/abc/edit",
      description: "",
      requiresPrevious: false,
      order: 1,
    });
    await set(ref(database, `courseVideos/${ORIGEM}/legado1`), {
      title: "Aula antiga",
      url: "https://www.youtube.com/watch?v=bbbbbbbbbbb",
      description: "Do semestre passado",
      order: 2,
    });
    await set(ref(database, `courseQuizzes/${ORIGEM}/aula1`), quizDeOrigem);

    // DESTINO: já tem uma aula, na posição 0.
    await set(ref(database, `courseContent/${DESTINO}/jaExistia`), {
      category: "video",
      title: "Aula que já estava aqui",
      url: "https://www.youtube.com/watch?v=zzzzzzzzzzz",
      description: "",
      requiresPrevious: false,
      order: 0,
    });
  });

  const conteudoDoDestino = async () => {
    const snap = await get(ref(database, `courseContent/${DESTINO}`));
    return Object.entries(snap.val() || {}).map(([id, item]) => ({ id, ...item }));
  };

  describe("fetchImportableContent", () => {
    it("lista a collection nova e o legado, na ordem global", async () => {
      const itens = await fetchImportableContent(ORIGEM);

      expect(itens.map((i) => i.title)).toEqual([
        "Aula 1 — Recursão",
        "Slides da Aula 1",
        "Aula antiga",
      ]);
    });

    it("diz quais itens têm questionário preso", async () => {
      const itens = await fetchImportableContent(ORIGEM);

      expect(itens.find((i) => i.id === "aula1").hasQuiz).toBe(true);
      expect(itens.find((i) => i.id === "slide1").hasQuiz).toBe(false);
    });

    it("não lista vídeo de entrega de aluno", async () => {
      await set(
        ref(database, `assignmentSubmissions/${ORIGEM}/trabalho1/aluno1`),
        {
          content: {
            video: {
              url: "https://www.youtube.com/watch?v=ccccccccccc",
              title: "Entrega do aluno",
              order: 3,
            },
          },
        }
      );

      const itens = await fetchImportableContent(ORIGEM);
      expect(itens.some((i) => i.title === "Entrega do aluno")).toBe(false);
    });
  });

  describe("importContentFromCourse", () => {
    it("anexa ao fim da ordem sem reindexar o que já estava no destino", async () => {
      await importContentFromCourse({
        sourceCourseId: ORIGEM,
        targetCourseId: DESTINO,
        selections: [{ contentId: "aula1" }, { contentId: "slide1" }],
      });

      const itens = await conteudoDoDestino();
      const jaExistia = itens.find((i) => i.id === "jaExistia");
      const importados = itens
        .filter((i) => i.id !== "jaExistia")
        .sort((a, b) => a.order - b.order);

      expect(jaExistia.order).toBe(0);
      expect(importados.map((i) => i.order)).toEqual([1, 2]);
    });

    it("respeita a ordem da origem, não a ordem dos cliques", async () => {
      await importContentFromCourse({
        sourceCourseId: ORIGEM,
        targetCourseId: DESTINO,
        selections: [{ contentId: "slide1" }, { contentId: "aula1" }],
      });

      const importados = (await conteudoDoDestino())
        .filter((i) => i.id !== "jaExistia")
        .sort((a, b) => a.order - b.order);

      expect(importados.map((i) => i.title)).toEqual([
        "Aula 1 — Recursão",
        "Slides da Aula 1",
      ]);
    });

    it("copia título, descrição e requiresPrevious", async () => {
      await importContentFromCourse({
        sourceCourseId: ORIGEM,
        targetCourseId: DESTINO,
        selections: [{ contentId: "aula1" }],
      });

      const importado = (await conteudoDoDestino()).find(
        (i) => i.title === "Aula 1 — Recursão"
      );

      expect(importado.description).toBe("Introdução");
      expect(importado.requiresPrevious).toBe(true);
      expect(importado.category).toBe("video");
    });

    it("traz o quiz preso ao ID NOVO quando o professor pede", async () => {
      const { imported, quizzes } = await importContentFromCourse({
        sourceCourseId: ORIGEM,
        targetCourseId: DESTINO,
        selections: [{ contentId: "aula1", withQuiz: true }],
      });

      expect(quizzes).toBe(1);
      const novoId = imported[0].id;
      expect(novoId).not.toBe("aula1");

      const quiz = (
        await get(ref(database, `courseQuizzes/${DESTINO}/${novoId}`))
      ).val();

      expect(quiz).toBeTruthy();
      expect(quiz.videoId).toBe(novoId);
      expect(quiz.courseId).toBe(DESTINO);
      expect(quiz.questions).toHaveLength(1);
      // Id novo: reaproveitar o da origem faria as respostas de lá casarem aqui.
      expect(quiz.questions[0].id).not.toBe("questao-original-1");
      expect(quiz.questions[0].question).toBe("O que é recursão?");
    });

    it("não traz o quiz de quem não pediu", async () => {
      const { imported, quizzes } = await importContentFromCourse({
        sourceCourseId: ORIGEM,
        targetCourseId: DESTINO,
        selections: [{ contentId: "aula1", withQuiz: false }],
      });

      expect(quizzes).toBe(0);
      const quiz = (
        await get(ref(database, `courseQuizzes/${DESTINO}/${imported[0].id}`))
      ).val();
      expect(quiz).toBeNull();
    });

    it("o quiz não fica no id de origem dentro do destino", async () => {
      await importContentFromCourse({
        sourceCourseId: ORIGEM,
        targetCourseId: DESTINO,
        selections: [{ contentId: "aula1", withQuiz: true }],
      });

      const noIdAntigo = (
        await get(ref(database, `courseQuizzes/${DESTINO}/aula1`))
      ).val();
      expect(noIdAntigo).toBeNull();
    });

    it("conteúdo legado da origem chega na collection nova", async () => {
      await importContentFromCourse({
        sourceCourseId: ORIGEM,
        targetCourseId: DESTINO,
        selections: [{ contentId: "legado1" }],
      });

      const importado = (await conteudoDoDestino()).find(
        (i) => i.title === "Aula antiga"
      );
      expect(importado).toBeTruthy();
      expect(importado.category).toBe("video");

      // E não criou registro legado novo no destino.
      const legadoNoDestino = (
        await get(ref(database, `courseVideos/${DESTINO}`))
      ).val();
      expect(legadoNoDestino).toBeNull();
    });

    it("pula item com URL inválida sem derrubar o resto", async () => {
      await set(ref(database, `courseContent/${ORIGEM}/quebrado`), {
        category: "video",
        title: "Aula com link quebrado",
        url: "não é uma url",
        order: 5,
      });

      const { imported, skipped } = await importContentFromCourse({
        sourceCourseId: ORIGEM,
        targetCourseId: DESTINO,
        selections: [{ contentId: "aula1" }, { contentId: "quebrado" }],
      });

      expect(imported).toHaveLength(1);
      expect(imported[0].title).toBe("Aula 1 — Recursão");
      expect(skipped).toHaveLength(1);
      expect(skipped[0].title).toBe("Aula com link quebrado");
    });

    it("recusa importar do próprio curso", async () => {
      await expect(
        importContentFromCourse({
          sourceCourseId: DESTINO,
          targetCourseId: DESTINO,
          selections: [{ contentId: "jaExistia" }],
        })
      ).rejects.toThrow(/não pode ser o próprio curso/);
    });

    it("recusa seleção vazia", async () => {
      await expect(
        importContentFromCourse({
          sourceCourseId: ORIGEM,
          targetCourseId: DESTINO,
          selections: [],
        })
      ).rejects.toThrow(/ao menos um conteúdo/);
    });

    it("não grava nada quando todos os itens são inválidos", async () => {
      await set(ref(database, `courseContent/${ORIGEM}/quebrado`), {
        category: "video",
        title: "Só link quebrado",
        url: "não é uma url",
        order: 5,
      });

      await expect(
        importContentFromCourse({
          sourceCourseId: ORIGEM,
          targetCourseId: DESTINO,
          selections: [{ contentId: "quebrado" }],
        })
      ).rejects.toThrow(/Nenhum conteúdo válido/);

      const itens = await conteudoDoDestino();
      expect(itens).toHaveLength(1);
      expect(itens[0].id).toBe("jaExistia");
    });
  });
});
