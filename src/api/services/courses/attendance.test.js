import { describe, it, expect } from "vitest";
import {
  isVideoWatched,
  computeStudentPresence,
  computeCoursePresence,
  formatWatchedTime,
  exportPresenceToCSV,
  DEFAULT_WATCHED_THRESHOLD,
} from "./attendance.js";

describe("isVideoWatched", () => {
  it("usa percentageWatched contra o limiar (90 por padrão)", () => {
    expect(isVideoWatched({ percentageWatched: 90 })).toBe(true);
    expect(isVideoWatched({ percentageWatched: 89 })).toBe(false);
    expect(isVideoWatched({ percentageWatched: 100 })).toBe(true);
  });
  it("cai para o flag watched quando não há percentual", () => {
    expect(isVideoWatched({ watched: true })).toBe(true);
    expect(isVideoWatched({ watched: false })).toBe(false);
  });
  it("respeita um limiar customizado (ex.: 100)", () => {
    expect(isVideoWatched({ percentageWatched: 90 }, 100)).toBe(false);
    expect(isVideoWatched({ percentageWatched: 100 }, 100)).toBe(true);
  });
  it("nó nulo/ausente não é assistido", () => {
    expect(isVideoWatched(null)).toBe(false);
    expect(isVideoWatched(undefined)).toBe(false);
  });
  it("DEFAULT_WATCHED_THRESHOLD é 90", () => {
    expect(DEFAULT_WATCHED_THRESHOLD).toBe(90);
  });
});

describe("computeStudentPresence", () => {
  const videos = [
    { id: "v1", title: "Aula 1" },
    { id: "v2", title: "Aula 2" },
    { id: "v3", title: "Aula 3" },
  ];

  it("conta vídeos assistidos e aplica presenças por vídeo", () => {
    const progress = {
      v1: { percentageWatched: 100, watchedTimeInSeconds: 600 },
      v2: { percentageWatched: 95, watchedTimeInSeconds: 570 },
      v3: { percentageWatched: 40, watchedTimeInSeconds: 240 },
    };
    const r = computeStudentPresence(videos, progress, { presencesPerVideo: 4 });
    expect(r.totalVideos).toBe(3);
    expect(r.watchedCount).toBe(2);
    expect(r.presences).toBe(8); // 2 assistidos x 4
    expect(r.maxPresences).toBe(12); // 3 x 4
    expect(r.presencePercent).toBeCloseTo(66.67, 1);
  });

  it("aluno sem nenhum progresso tem presença zero", () => {
    const r = computeStudentPresence(videos, {}, { presencesPerVideo: 4 });
    expect(r.watchedCount).toBe(0);
    expect(r.presences).toBe(0);
    expect(r.presencePercent).toBe(0);
    expect(r.perVideo).toHaveLength(3);
    expect(r.perVideo.every((p) => !p.watched)).toBe(true);
  });

  it("100% de presença quando todos os vídeos são assistidos", () => {
    const progress = {
      v1: { percentageWatched: 100 },
      v2: { percentageWatched: 90 },
      v3: { percentageWatched: 99 },
    };
    const r = computeStudentPresence(videos, progress, { presencesPerVideo: 4 });
    expect(r.watchedCount).toBe(3);
    expect(r.presences).toBe(12);
    expect(r.presencePercent).toBe(100);
  });

  it("presencesPerVideo padrão é 1", () => {
    const r = computeStudentPresence(videos, { v1: { percentageWatched: 100 } });
    expect(r.presences).toBe(1);
    expect(r.maxPresences).toBe(3);
  });

  it("curso sem vídeos não divide por zero", () => {
    const r = computeStudentPresence([], {}, { presencesPerVideo: 4 });
    expect(r.totalVideos).toBe(0);
    expect(r.presencePercent).toBe(0);
  });
});

describe("computeCoursePresence", () => {
  it("calcula todos os alunos preservando identidade", () => {
    const videos = [{ id: "v1", title: "Aula 1" }];
    const students = [
      { userId: "u1", name: "Ana", email: "ana@x.com", progressById: { v1: { percentageWatched: 100 } } },
      { userId: "u2", name: "Bia", email: "bia@x.com", progressById: {} },
    ];
    const result = computeCoursePresence(students, videos, { presencesPerVideo: 4 });
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ userId: "u1", name: "Ana", presences: 4, presencePercent: 100 });
    expect(result[1]).toMatchObject({ userId: "u2", name: "Bia", presences: 0, presencePercent: 0 });
  });
});

describe("formatWatchedTime", () => {
  it("formata MM:SS e HH:MM:SS", () => {
    expect(formatWatchedTime(0)).toBe("0:00");
    expect(formatWatchedTime(65)).toBe("1:05");
    expect(formatWatchedTime(3661)).toBe("1:01:01");
  });
  it("trata valores inválidos como zero", () => {
    expect(formatWatchedTime(undefined)).toBe("0:00");
    expect(formatWatchedTime(-10)).toBe("0:00");
  });
});

describe("exportPresenceToCSV", () => {
  it("gera cabeçalho e uma linha por aluno, com colunas por vídeo", () => {
    const videos = [
      { id: "v1", title: "Aula 1" },
      { id: "v2", title: "Aula 2" },
    ];
    const students = [
      { userId: "u1", name: "Ana", email: "ana@x.com", progressById: { v1: { percentageWatched: 100, watchedTimeInSeconds: 600 }, v2: { percentageWatched: 30, watchedTimeInSeconds: 180 } } },
    ];
    const presence = computeCoursePresence(students, videos, { presencesPerVideo: 4 });
    const csv = exportPresenceToCSV(presence, videos, { presencesPerVideo: 4 });
    const lines = csv.split("\n");
    expect(lines[0]).toContain("Nome");
    expect(lines[0]).toContain("Aula 1 - %");
    expect(lines[0]).toContain("Presenças (x4)");
    expect(lines[1]).toContain("Ana");
    expect(lines[1]).toContain("100%");
    expect(lines[1]).toContain('"1/2"'); // vídeos assistidos
    expect(lines[1]).toContain('"4/8"'); // presenças
  });

  it("escapa aspas em nomes", () => {
    const videos = [{ id: "v1", title: "Aula 1" }];
    const presence = computeCoursePresence(
      [{ userId: "u1", name: 'Ana "A"', email: "ana@x.com", progressById: {} }],
      videos,
      { presencesPerVideo: 1 }
    );
    const csv = exportPresenceToCSV(presence, videos, { presencesPerVideo: 1 });
    expect(csv).toContain('"Ana ""A"""');
  });
});
