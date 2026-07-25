import { describe, it, expect } from "vitest";
import {
  extractYouTubeId,
  normalizeTitle,
  isWatchedNode,
  isItemCompleted,
  collectCurrentContentIds,
  findOrphanProgress,
  recomputeAggregate,
  mergeProgressNode,
  isQuizPassedResult,
  normalizeQuizResultId,
  buildQuizPassedById,
  findOrphanQuizResults,
  mergeQuizResultNode,
} from "./progressAudit.js";

describe("extractYouTubeId", () => {
  it("extrai de watch?v=, youtu.be e /embed/", () => {
    expect(extractYouTubeId("https://www.youtube.com/watch?v=ABC123")).toBe("ABC123");
    expect(extractYouTubeId("https://youtu.be/XYZ789")).toBe("XYZ789");
    expect(extractYouTubeId("https://youtube.com/embed/EMB456")).toBe("EMB456");
  });
  it("retorna null para url inválida ou não-youtube", () => {
    expect(extractYouTubeId("não é url")).toBeNull();
    expect(extractYouTubeId("https://vimeo.com/123")).toBeNull();
    expect(extractYouTubeId("")).toBeNull();
  });
});

describe("normalizeTitle", () => {
  it("ignora caixa, acentos e espaços redundantes", () => {
    expect(normalizeTitle("  Introdução   à  Lógica ")).toBe("introducao a logica");
  });
});

describe("isWatchedNode", () => {
  it("considera watched=true ou percentageWatched>=90", () => {
    expect(isWatchedNode({ watched: true })).toBe(true);
    expect(isWatchedNode({ percentageWatched: 90 })).toBe(true);
    expect(isWatchedNode({ percentageWatched: 80 })).toBe(false);
    expect(isWatchedNode(null)).toBe(false);
  });
});

describe("isItemCompleted", () => {
  it("exige assistido e, havendo quiz, aprovado", () => {
    expect(isItemCompleted({ watched: true })).toBe(true);
    expect(isItemCompleted({ watched: true, hasQuiz: true, quizPassed: false })).toBe(false);
    expect(isItemCompleted({ watched: true, hasQuiz: true, quizPassed: true })).toBe(true);
    expect(isItemCompleted({ watched: false })).toBe(false);
  });
});

describe("collectCurrentContentIds", () => {
  it("une ids de conteúdo, vídeos, slides e entregas", () => {
    const ids = collectCurrentContentIds({
      content: { c1: {}, c2: {} },
      videos: { v1: {} },
      slides: { s1: {} },
      flippedIds: ["flip_a_b"],
    });
    expect([...ids].sort()).toEqual(["c1", "c2", "flip_a_b", "s1", "v1"]);
  });
  it("ignora entradas nulas", () => {
    const ids = collectCurrentContentIds({ content: { c1: null, c2: {} } });
    expect([...ids]).toEqual(["c2"]);
  });
});

describe("findOrphanProgress", () => {
  const current = new Set(["novo1", "v1"]);
  it("acha assistidos cujo id sumiu do conteúdo", () => {
    const prog = {
      antigo1: { watched: true, percentageWatched: 100 },
      v1: { watched: true, percentageWatched: 100 }, // ainda existe → não órfão
      antigo2: { watched: false, percentageWatched: 20 }, // não assistido → ignora
    };
    const orphans = findOrphanProgress(prog, current);
    expect(orphans).toHaveLength(1);
    expect(orphans[0].id).toBe("antigo1");
    expect(orphans[0].watched).toBe(true);
  });
  it("lista vazia sem progresso", () => {
    expect(findOrphanProgress(null, current)).toEqual([]);
  });
});

describe("recomputeAggregate", () => {
  it("conta slides como assistidos e exige quiz aprovado", () => {
    const items = [
      { id: "v1", isSlide: false, hasQuiz: false },
      { id: "v2", isSlide: false, hasQuiz: true },
      { id: "s1", isSlide: true, hasQuiz: false },
    ];
    const progress = {
      v1: { watched: true, percentageWatched: 100 },
      v2: { watched: true, percentageWatched: 100, quizPassed: false }, // quiz pendente
    };
    const r = recomputeAggregate(items, progress, {});
    // v1 ok, s1 (slide) ok, v2 não (quiz pendente) → 2/3
    expect(r.total).toBe(3);
    expect(r.completed).toBe(2);
    expect(Math.round(r.progress)).toBe(67);
  });
  it("100% quando tudo concluído", () => {
    const items = [{ id: "v1", isSlide: false, hasQuiz: true }];
    const r = recomputeAggregate(items, { v1: { watched: true, quizPassed: true } }, {});
    expect(r.progress).toBe(100);
  });
});

describe("isQuizPassedResult / normalizeQuizResultId", () => {
  it("reconhece aprovação por isPassed ou passed", () => {
    expect(isQuizPassedResult({ isPassed: true })).toBe(true);
    expect(isQuizPassedResult({ passed: true })).toBe(true);
    expect(isQuizPassedResult({ isPassed: false, passed: false })).toBe(false);
    expect(isQuizPassedResult(null)).toBe(false);
  });
  it("remove o prefixo slide_ dos slides legados", () => {
    expect(normalizeQuizResultId("slide_abc")).toBe("abc");
    expect(normalizeQuizResultId("abc")).toBe("abc");
  });
});

describe("buildQuizPassedById", () => {
  it("mapeia por id de conteúdo, normalizando slides legados", () => {
    const map = buildQuizPassedById({
      v1: { isPassed: true },
      v2: { passed: false },
      slide_s1: { passed: true },
    });
    expect(map).toEqual({ v1: true, s1: true });
  });
});

describe("findOrphanQuizResults", () => {
  const current = new Set(["v1", "s1"]);
  it("acha aprovações cujo id sumiu do conteúdo", () => {
    const orphans = findOrphanQuizResults(
      {
        v1: { isPassed: true }, // ainda existe
        antigo: { isPassed: true }, // órfão
        naoPassou: { isPassed: false }, // ignorado
        slide_s1: { passed: true }, // slide atual (normaliza p/ s1) → não órfão
      },
      current
    );
    expect(orphans).toHaveLength(1);
    expect(orphans[0]).toMatchObject({ key: "antigo", contentId: "antigo" });
  });
});

describe("mergeQuizResultNode", () => {
  it("copia a aprovação para um destino vazio", () => {
    const merged = mergeQuizResultNode({ isPassed: true, scorePercentage: 80 }, undefined);
    expect(merged.isPassed).toBe(true);
    expect(merged.passed).toBe(true);
    expect(merged.scorePercentage).toBe(80);
  });
  it("promove um destino não aprovado, preservando seus dados", () => {
    const merged = mergeQuizResultNode(
      { isPassed: true },
      { isPassed: false, attemptCount: 3 }
    );
    expect(merged).toMatchObject({ isPassed: true, passed: true, attemptCount: 3 });
  });
  it("não rebaixa/duplica um destino já aprovado (null)", () => {
    expect(mergeQuizResultNode({ isPassed: true }, { passed: true })).toBeNull();
  });
  it("não faz nada quando a origem não passou (null)", () => {
    expect(mergeQuizResultNode({ isPassed: false }, undefined)).toBeNull();
  });
});

describe("mergeProgressNode", () => {
  it("eleva o destino sem rebaixar e preserva quizPassed", () => {
    const source = { watched: true, percentageWatched: 100, completed: true };
    const target = { watched: false, percentageWatched: 50, quizPassed: true };
    const merged = mergeProgressNode(source, target);
    expect(merged.percentageWatched).toBe(100);
    expect(merged.watched).toBe(true);
    expect(merged.completed).toBe(true);
    expect(merged.quizPassed).toBe(true); // preservado do destino
  });
  it("não rebaixa um destino já mais completo (retorna null)", () => {
    const source = { watched: true, percentageWatched: 90 };
    const target = { watched: true, percentageWatched: 100, completed: true };
    expect(mergeProgressNode(source, target)).toBeNull();
  });
  it("migra para destino vazio", () => {
    const merged = mergeProgressNode({ watched: true, percentageWatched: 100 }, undefined);
    expect(merged.watched).toBe(true);
    expect(merged.percentageWatched).toBe(100);
  });
});
