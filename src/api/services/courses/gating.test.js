import { describe, it, expect, vi } from "vitest";

// isVideoLocked/isQuizLocked são funções PURAS, mas vivem em módulos que importam
// o config do Firebase no topo (que chama getAnalytics e quebra em ambiente de
// teste). Mockamos o config: a lógica de trava não toca o banco.
vi.mock("../../config/firebase", () => ({ database: {}, auth: {}, analytics: {} }));

const { isVideoLocked } = await import("./videos.js");
const { isQuizLocked } = await import("./quizzes.js");

// Sequenciamento: quiz trava até o vídeo ser assistido; o próximo vídeo trava
// até o anterior estar concluído (assistido e, havendo quiz, aprovado). O
// bloqueio do vídeo só vale quando o item tem `requiresPrevious === true`.

const V = (over = {}) => ({
  id: over.id || "v",
  isSlide: false,
  watched: false,
  quizId: null,
  quizPassed: false,
  requiresPrevious: true,
  ...over,
});

describe("isQuizLocked (quiz só libera após assistir o vídeo)", () => {
  it("sem quiz, nunca trava", () => {
    expect(isQuizLocked(V({ quizId: null, watched: false }))).toBe(false);
  });
  it("com quiz e vídeo NÃO assistido → travado", () => {
    expect(isQuizLocked(V({ quizId: "c/v", watched: false }))).toBe(true);
  });
  it("com quiz e vídeo assistido → liberado", () => {
    expect(isQuizLocked(V({ quizId: "c/v", watched: true }))).toBe(false);
  });
  it("entrada inválida não trava", () => {
    expect(isQuizLocked(null)).toBe(false);
    expect(isQuizLocked({})).toBe(false);
  });
});

describe("isVideoLocked (próximo vídeo só libera após concluir o anterior)", () => {
  it("o primeiro vídeo nunca trava", () => {
    const v0 = V({ id: "v0" });
    expect(isVideoLocked(v0, [v0, V({ id: "v1" })])).toBe(false);
  });

  it("requiresPrevious=false nunca trava, mesmo com anterior incompleto", () => {
    const list = [V({ id: "v0", watched: false }), V({ id: "v1", requiresPrevious: false })];
    expect(isVideoLocked(list[1], list)).toBe(false);
  });

  it("anterior NÃO assistido → travado", () => {
    const list = [V({ id: "v0", watched: false }), V({ id: "v1" })];
    expect(isVideoLocked(list[1], list)).toBe(true);
  });

  it("anterior assistido, sem quiz → liberado", () => {
    const list = [V({ id: "v0", watched: true, quizId: null }), V({ id: "v1" })];
    expect(isVideoLocked(list[1], list)).toBe(false);
  });

  it("anterior assistido, com quiz NÃO aprovado → travado", () => {
    const list = [V({ id: "v0", watched: true, quizId: "c/v0", quizPassed: false }), V({ id: "v1" })];
    expect(isVideoLocked(list[1], list)).toBe(true);
  });

  it("anterior assistido, com quiz aprovado → liberado", () => {
    const list = [V({ id: "v0", watched: true, quizId: "c/v0", quizPassed: true }), V({ id: "v1" })];
    expect(isVideoLocked(list[1], list)).toBe(false);
  });

  it("anterior é slide (sempre assistido, sem quiz) → libera o vídeo seguinte", () => {
    const slide = V({ id: "s", isSlide: true, watched: true, quizId: null });
    const list = [slide, V({ id: "v1" })];
    expect(isVideoLocked(list[1], list)).toBe(false);
  });

  it("entradas inválidas não travam", () => {
    expect(isVideoLocked(null, [])).toBe(false);
    expect(isVideoLocked(V(), null)).toBe(false);
  });

  // Quem perdeu o prazo do quiz não tem como fazê-lo: prender o aluno no resto
  // do curso seria uma punição sem saída.
  it("anterior assistido, quiz ENCERRADO e não aprovado → liberado", () => {
    const list = [
      V({ id: "v0", watched: true, quizId: "c/v0", quizPassed: false, quizClosed: true }),
      V({ id: "v1" }),
    ];
    expect(isVideoLocked(list[1], list)).toBe(false);
  });

  it("quiz encerrado NÃO desculpa não ter assistido o vídeo anterior", () => {
    const list = [
      V({ id: "v0", watched: false, quizId: "c/v0", quizPassed: false, quizClosed: true }),
      V({ id: "v1" }),
    ];
    expect(isVideoLocked(list[1], list)).toBe(true);
  });

  it("quiz ainda ABERTO e não aprovado continua travando", () => {
    const list = [
      V({ id: "v0", watched: true, quizId: "c/v0", quizPassed: false, quizClosed: false }),
      V({ id: "v1" }),
    ];
    expect(isVideoLocked(list[1], list)).toBe(true);
  });

  it("um SLIDE também pode ser travado (trava pertence ao conteúdo)", () => {
    const list = [
      V({ id: "v0", watched: false }), // vídeo anterior incompleto
      V({ id: "s1", isSlide: true, watched: true, requiresPrevious: true }),
    ];
    expect(isVideoLocked(list[1], list)).toBe(true); // slide travado pelo v0
  });

  it("slide com requiresPrevious=false nunca trava", () => {
    const list = [
      V({ id: "v0", watched: false }),
      V({ id: "s1", isSlide: true, watched: true, requiresPrevious: false }),
    ];
    expect(isVideoLocked(list[1], list)).toBe(false);
  });
});

describe("fluxo completo de 3 vídeos com quiz (todos requiresPrevious)", () => {
  // Estado mutável simulando a progressão do aluno.
  const mk = () => [
    V({ id: "v0", quizId: "c/v0", requiresPrevious: false }), // 1º: sem trava
    V({ id: "v1", quizId: "c/v1" }),
    V({ id: "v2", quizId: "c/v2" }),
  ];
  const nextUnlockedVideo = (list) =>
    list.find((v) => !isVideoLocked(v, list));

  it("no início, só o 1º vídeo está acessível e seu quiz está travado", () => {
    const list = mk();
    expect(isVideoLocked(list[0], list)).toBe(false);
    expect(isVideoLocked(list[1], list)).toBe(true);
    expect(isVideoLocked(list[2], list)).toBe(true);
    expect(isQuizLocked(list[0])).toBe(true); // ainda não assistiu
  });

  it("assistir v0 libera o quiz de v0, mas NÃO o v1 (quiz pendente)", () => {
    const list = mk();
    list[0].watched = true;
    expect(isQuizLocked(list[0])).toBe(false); // quiz liberado
    expect(isVideoLocked(list[1], list)).toBe(true); // v1 ainda travado
  });

  it("passar no quiz de v0 libera v1; e a cadeia se repete até v2", () => {
    const list = mk();
    // conclui v0
    list[0].watched = true;
    list[0].quizPassed = true;
    expect(isVideoLocked(list[1], list)).toBe(false); // v1 liberado
    expect(isVideoLocked(list[2], list)).toBe(true); // v2 ainda travado
    expect(isQuizLocked(list[1])).toBe(true); // quiz de v1 travado até assistir

    // conclui v1
    list[1].watched = true;
    expect(isQuizLocked(list[1])).toBe(false);
    list[1].quizPassed = true;
    expect(isVideoLocked(list[2], list)).toBe(false); // v2 liberado

    // ao final, o "próximo acessível" é v2
    list[2].watched = true;
    list[2].quizPassed = true;
    expect(nextUnlockedVideo(list).id).toBe("v0"); // todos liberados → o primeiro
    expect(list.every((v) => !isVideoLocked(v, list))).toBe(true);
  });
});
