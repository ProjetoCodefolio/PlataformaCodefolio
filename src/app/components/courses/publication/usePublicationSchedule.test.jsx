// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";

vi.mock("$api/config/firebase", () => ({ database: {}, auth: {}, analytics: {} }));
vi.mock("firebase/database", () => ({ ref: vi.fn(), onValue: vi.fn() }));

const { usePublicationSchedule } = await import("./PublicationScheduler.jsx");

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/**
 * O que importa aqui é a regra de convivência entre a série e a edição à mão:
 * aplicar preenche, editar marca, e aplicar de novo por cima de uma data
 * editada só acontece depois de o professor confirmar.
 */

let container;
let root;
let agenda;

const Sonda = () => {
  agenda = usePublicationSchedule();
  return null;
};

const inicio = new Date(2030, 2, 4, 19, 0).toISOString();

beforeEach(() => {
  container = document.createElement("div");
  root = createRoot(container);
  act(() => root.render(<Sonda />));
  act(() => {
    agenda.setEnabled(true);
    agenda.setStart(inicio);
  });
});

afterEach(() => {
  act(() => root.unmount());
});

describe("usePublicationSchedule", () => {
  it("desligado não manda data nenhuma", () => {
    act(() => agenda.setEnabled(false));
    expect(agenda.publishAtFor("a")).toBeUndefined();
  });

  it("aplicar preenche uma data por item, na ordem", () => {
    act(() => agenda.apply(["a", "b"]));
    expect(agenda.publishAtFor("a")).toBe(inicio);
    expect(new Date(agenda.publishAtFor("b")).getDate()).toBe(11);
  });

  it("não sobrescreve data editada à mão sem confirmação", () => {
    act(() => agenda.apply(["a", "b"]));
    const manual = new Date(2030, 5, 1, 8, 0).toISOString();
    act(() => agenda.setDateFor("b", manual));

    act(() => agenda.apply(["a", "b"]));
    expect(agenda.confirmandoSobrescrita).toBe(true);
    expect(agenda.publishAtFor("b")).toBe(manual);

    act(() => agenda.apply(["a", "b"], { force: true }));
    expect(agenda.confirmandoSobrescrita).toBe(false);
    expect(agenda.publishAtFor("b")).not.toBe(manual);
  });

  it("avisa quando a seleção muda depois de aplicar", () => {
    act(() => agenda.apply(["a", "b"]));
    expect(agenda.selecaoMudou(["a", "b"])).toBe(false);
    expect(agenda.selecaoMudou(["a"])).toBe(true);
  });
});
