import { describe, it, expect } from "vitest";
import { buildQueueEntriesFromNodes, nextQueueEntry } from "./publicationQueueEntries.js";

const NOW = new Date("2026-03-01T12:00:00.000Z");
const PASSADO = "2026-02-01T12:00:00.000Z";
const FUTURO = "2026-03-10T12:00:00.000Z";
const DEPOIS = "2026-03-20T12:00:00.000Z";

describe("buildQueueEntriesFromNodes", () => {
  it("só o que está programado, com o quiz na data efetiva", () => {
    const entradas = buildQueueEntriesFromNodes(
      {
        courseContent: {
          c1: {
            a: { title: "A", publishAt: FUTURO },
            b: { title: "B", publishAt: PASSADO },
            d: { title: "D" },
          },
        },
        courseSlides: { c1: { s: { title: "S", publishAt: FUTURO } } },
        courseQuizzes: {
          c1: {
            a: {},
            d: { publishAt: DEPOIS },
            slide_s: {},
          },
        },
      },
      NOW
    );

    expect(Object.keys(entradas).sort()).toEqual([
      "c1__content__a",
      "c1__content__s",
      "c1__quiz__a",
      "c1__quiz__d",
      "c1__quiz__slide_s",
    ]);
    expect(entradas["c1__quiz__a"]).toMatchObject({ kind: "quiz", itemKey: "a", publishAt: FUTURO });
    expect(entradas["c1__quiz__d"].publishAt).toBe(DEPOIS);
    expect(entradas["c1__quiz__slide_s"]).toMatchObject({ source: "slide", contentId: "s" });
  });

  it("banco vazio ou nós ausentes não quebram", () => {
    expect(buildQueueEntriesFromNodes({}, NOW)).toEqual({});
  });
});

describe("nextQueueEntry", () => {
  const base = { courseId: "c", kind: "content", itemKey: "a" };
  it("programado, publicado devendo aviso, publicado sem dívida e excluído", () => {
    expect(nextQueueEntry({ exists: true, publishAt: FUTURO, current: null, base, now: NOW }).publishAt).toBe(FUTURO);
    expect(nextQueueEntry({ exists: true, publishAt: "", current: {}, base, now: NOW }).publishAt).toBe(NOW.toISOString());
    expect(nextQueueEntry({ exists: true, publishAt: "", current: null, base, now: NOW })).toBeNull();
    expect(nextQueueEntry({ exists: false, publishAt: FUTURO, current: {}, base, now: NOW })).toBeNull();
  });
});
