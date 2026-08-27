// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { useScrollToForm } from "./useScrollToForm.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/**
 * O jsdom não implementa `scrollIntoView` nem faz layout, então o que este
 * teste protege não é o pixel: é a DECISÃO de descontar a Topbar fixa. Sem o
 * `scrollMarginTop` a rolagem para debaixo da barra roxa e o professor não vê
 * o formulário que acabou de abrir.
 */

let container;
let root;
let scrollIntoView;

const Aba = ({ aoMontar }) => {
  const [formRef, scrollToForm] = useScrollToForm();
  aoMontar(scrollToForm);
  return <div ref={formRef} data-testid="form" />;
};

const montar = () => {
  let scrollToForm;
  act(() => {
    root.render(<Aba aoMontar={(fn) => { scrollToForm = fn; }} />);
  });
  return scrollToForm;
};

beforeEach(() => {
  vi.useFakeTimers();
  scrollIntoView = vi.fn();
  Element.prototype.scrollIntoView = scrollIntoView;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useScrollToForm", () => {
  it("rola até o formulário descontando a altura da Topbar fixa", () => {
    const scrollToForm = montar();

    act(() => {
      scrollToForm();
      vi.runAllTimers();
    });

    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });
    expect(container.querySelector("[data-testid='form']").style.scrollMarginTop)
      .toBe("66px");
  });

  it("não rola no mesmo tick do clique, para o formulário terminar de renderizar", () => {
    const scrollToForm = montar();

    act(() => scrollToForm());
    expect(scrollIntoView).not.toHaveBeenCalled();

    act(() => vi.runAllTimers());
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it("não quebra se a aba for desmontada antes da rolagem acontecer", () => {
    const scrollToForm = montar();

    act(() => scrollToForm());
    act(() => root.unmount());
    root = createRoot(container);

    expect(() => act(() => vi.runAllTimers())).not.toThrow();
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
