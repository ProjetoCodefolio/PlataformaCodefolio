import { describe, it, expect, vi } from "vitest";

// A lógica é pura; só o relógio do servidor toca o Firebase.
vi.mock("../../config/firebase", () => ({ database: {}, auth: {}, analytics: {} }));
vi.mock("firebase/database", () => ({ ref: vi.fn(), onValue: vi.fn() }));

const {
  normalizePublishAt,
  isScheduled,
  isPublished,
  filterPublished,
  effectiveQuizPublishAt,
  publishAtToPersist,
  buildPublicationSchedule,
} = await import("./publication.js");

const NOW = new Date("2026-03-01T12:00:00.000Z");
const PAST = "2026-02-01T12:00:00.000Z";
const FUTURE = "2026-03-10T12:00:00.000Z";
const LATER = "2026-03-20T12:00:00.000Z";

describe("normalizePublishAt", () => {
  it("devolve '' para ausente ou inválida", () => {
    expect(normalizePublishAt("")).toBe("");
    expect(normalizePublishAt(null)).toBe("");
    expect(normalizePublishAt(undefined)).toBe("");
    expect(normalizePublishAt("não é data")).toBe("");
  });
  it("normaliza para ISO", () => {
    expect(normalizePublishAt(FUTURE)).toBe(FUTURE);
  });
});

describe("isPublished / isScheduled", () => {
  it("sem data é publicado", () => {
    expect(isPublished({}, NOW)).toBe(true);
    expect(isPublished({ publishAt: "" }, NOW)).toBe(true);
    expect(isPublished({ publishAt: null }, NOW)).toBe(true);
    expect(isPublished(null, NOW)).toBe(true);
  });
  it("data inválida não esconde o item", () => {
    expect(isPublished({ publishAt: "lixo" }, NOW)).toBe(true);
  });
  it("data passada é publicado, futura é programado", () => {
    expect(isPublished({ publishAt: PAST }, NOW)).toBe(true);
    expect(isPublished({ publishAt: FUTURE }, NOW)).toBe(false);
    expect(isScheduled(FUTURE, NOW)).toBe(true);
    expect(isScheduled(PAST, NOW)).toBe(false);
  });
  it("vira publicado exatamente na data", () => {
    expect(isPublished({ publishAt: FUTURE }, new Date(FUTURE))).toBe(true);
  });
});

describe("filterPublished", () => {
  it("mantém a ordem e tira só os programados", () => {
    const items = [{ id: "a" }, { id: "b", publishAt: FUTURE }, { id: "c", publishAt: PAST }];
    expect(filterPublished(items, NOW).map((i) => i.id)).toEqual(["a", "c"]);
    expect(filterPublished(undefined, NOW)).toEqual([]);
  });
});

describe("effectiveQuizPublishAt", () => {
  it("vale a maior das duas datas", () => {
    expect(effectiveQuizPublishAt({ publishAt: FUTURE }, { publishAt: LATER })).toBe(LATER);
    expect(effectiveQuizPublishAt({ publishAt: LATER }, { publishAt: FUTURE })).toBe(LATER);
  });
  it("usa a que existir, ou '' sem nenhuma", () => {
    expect(effectiveQuizPublishAt({}, { publishAt: FUTURE })).toBe(FUTURE);
    expect(effectiveQuizPublishAt({ publishAt: FUTURE }, null)).toBe(FUTURE);
    expect(effectiveQuizPublishAt({}, {})).toBe("");
  });
});

describe("publishAtToPersist", () => {
  it("futuro grava ISO; vazio ou passado grava null", () => {
    expect(publishAtToPersist(FUTURE, NOW)).toBe(FUTURE);
    expect(publishAtToPersist(PAST, NOW)).toBeNull();
    expect(publishAtToPersist("", NOW)).toBeNull();
    expect(publishAtToPersist(undefined, NOW)).toBeNull();
  });
});

describe("buildPublicationSchedule", () => {
  const start = new Date(2026, 2, 2, 19, 0).toISOString(); // 02/03 19h local

  it("um por semana, na ordem recebida, mantendo a hora local", () => {
    const s = buildPublicationSchedule(["a", "b", "c"], { start, intervalDays: 7 });
    const local = (iso) => {
      const d = new Date(iso);
      return [d.getDate(), d.getMonth() + 1, d.getHours()];
    };
    expect(local(s.a)).toEqual([2, 3, 19]);
    expect(local(s.b)).toEqual([9, 3, 19]);
    expect(local(s.c)).toEqual([16, 3, 19]);
  });

  it("vários itens por leva saem na mesma data", () => {
    const s = buildPublicationSchedule(["v1", "s1", "v2", "s2"], {
      start,
      intervalDays: 7,
      perSlot: 2,
    });
    expect(s.v1).toBe(s.s1);
    expect(s.v2).toBe(s.s2);
    expect(new Date(s.v2) - new Date(s.v1)).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it("início inválido não agenda nada; parâmetros ruins caem no padrão", () => {
    expect(buildPublicationSchedule(["a"], { start: "" })).toEqual({});
    const s = buildPublicationSchedule(["a", "b"], { start, perSlot: 0 });
    expect(s.a).not.toBe(s.b);
  });
});
