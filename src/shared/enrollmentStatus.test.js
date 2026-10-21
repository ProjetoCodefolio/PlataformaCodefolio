import { describe, it, expect } from "vitest";
import {
  END_REASONS,
  activeStudentIds,
  enrollmentEndedLabel,
  enrollmentRowFlags,
  isActiveEnrollment,
  sortEndedLast,
} from "./enrollmentStatus.js";

/**
 * O que este teste protege: "o registro existe" não é "está na turma". O app e
 * o Worker decidem quem está na turma por estas funções, e as listas do
 * professor marcam e põem no fim quem saiu ou foi removido.
 */

const ENDED_AT = "2026-10-12T15:00:00.000Z";
const saiu = { progress: 40, endedAt: ENDED_AT, endReason: END_REASONS.LEFT };
const removido = { progress: 40, endedAt: ENDED_AT, endReason: END_REASONS.REMOVED };

describe("isActiveEnrollment", () => {
  it("só a matrícula sem endedAt está na turma", () => {
    expect(isActiveEnrollment({ progress: 0 })).toBe(true);
    expect(isActiveEnrollment(saiu)).toBe(false);
    expect(isActiveEnrollment(null)).toBe(false);
  });
});

describe("activeStudentIds", () => {
  it("lista quem tem matrícula ativa no curso, e só nele", () => {
    const nó = {
      ana: { c1: { progress: 10 } },
      bia: { c1: saiu },
      caio: { c2: { progress: 10 } },
      davi: { c1: removido, c2: { progress: 5 } },
    };
    expect(activeStudentIds(nó, "c1")).toEqual(["ana"]);
    expect(activeStudentIds(nó, "c2")).toEqual(["caio", "davi"]);
    expect(activeStudentIds(undefined, "c1")).toEqual([]);
  });
});

describe("enrollmentRowFlags", () => {
  it("marca a linha de quem está fora da turma, com motivo e data", () => {
    expect(enrollmentRowFlags(removido)).toEqual({
      enrollmentEnded: true,
      endReason: END_REASONS.REMOVED,
      endedAt: ENDED_AT,
    });
    expect(enrollmentRowFlags({ progress: 10 })).toEqual({
      enrollmentEnded: false,
      endReason: null,
      endedAt: null,
    });
  });
});

describe("sortEndedLast", () => {
  it("põe quem está fora no fim sem mexer na ordem de cada grupo", () => {
    const linhas = [
      { name: "Ana", enrollmentEnded: true },
      { name: "Bia" },
      { name: "Caio", enrollmentEnded: true },
      { name: "Davi" },
    ];
    expect(sortEndedLast(linhas).map((l) => l.name)).toEqual(["Bia", "Davi", "Ana", "Caio"]);
  });
});

describe("enrollmentEndedLabel", () => {
  const TZ = "America/Sao_Paulo";

  it("diz se saiu ou foi removido, com ou sem a data", () => {
    expect(enrollmentEndedLabel(enrollmentRowFlags(saiu), { timeZone: TZ })).toBe(
      "Saiu da turma em 12/10/2026"
    );
    expect(enrollmentEndedLabel(enrollmentRowFlags(removido), { withDate: false })).toBe(
      "Removido da turma"
    );
  });

  it("fica vazio para quem está na turma", () => {
    expect(enrollmentEndedLabel(enrollmentRowFlags({ progress: 1 }))).toBe("");
  });
});
