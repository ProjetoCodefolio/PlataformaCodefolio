// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";

vi.mock("react-toastify", () => ({
  toast: { warn: vi.fn(), info: vi.fn() },
}));

const { useQuizGate } = await import("./useQuizGate.js");

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

const contentItems = [
  { id: "video-1", title: "Aula 1", quizId: "curso/video-1", watched: true, isSlide: false },
];
const getQuizResultKey = (id) => id;

const Aba = ({ quizSettings, userAttempts, aoMontar }) => {
  const gate = useQuizGate({ contentItems, quizSettings, userAttempts, getQuizResultKey });
  aoMontar(gate);
  return <div data-testid="pending">{gate.pendingQuizStart ? "pendente" : "livre"}</div>;
};

const montar = (props) => {
  let gate;
  act(() => {
    root.render(<Aba {...props} aoMontar={(g) => { gate = g; }} />);
  });
  return () => gate;
};

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

describe("useQuizGate", () => {
  it("quiz sem limite de tentativas: inicia direto, sem diálogo de confirmação", () => {
    const getGate = montar({ quizSettings: {}, userAttempts: {} });
    const start = vi.fn();

    act(() => {
      getGate().requestQuizStart("curso/video-1", start);
    });

    expect(start).toHaveBeenCalledTimes(1);
    expect(getGate().pendingQuizStart).toBeNull();
  });

  it("quiz com limite finito de tentativas: NÃO inicia de imediato, guarda em pendingQuizStart", () => {
    const getGate = montar({
      quizSettings: { "video-1": { allowRetry: true, maxAttempts: 3 } },
      userAttempts: { "video-1": { attemptCount: 1 } },
    });
    const start = vi.fn();

    act(() => {
      getGate().requestQuizStart("curso/video-1", start);
    });

    expect(start).not.toHaveBeenCalled();
    expect(getGate().pendingQuizStart).toMatchObject({
      attemptLimit: 3,
      attemptsUsed: 1,
    });
  });

  it("quiz bloqueado (limite já atingido): não inicia e não abre diálogo de confirmação", () => {
    const getGate = montar({
      quizSettings: { "video-1": { allowRetry: true, maxAttempts: 1 } },
      userAttempts: { "video-1": { attemptCount: 1 } },
    });
    const start = vi.fn();

    act(() => {
      getGate().requestQuizStart("curso/video-1", start);
    });

    expect(start).not.toHaveBeenCalled();
    expect(getGate().pendingQuizStart).toBeNull();
  });
});
