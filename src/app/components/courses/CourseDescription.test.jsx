// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import CourseDescription from "./CourseDescription.jsx";

// Sinaliza ao React 18 que os `act(...)` daqui são de teste.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/**
 * O jsdom não faz layout — `scrollHeight` e `clientHeight` são sempre 0 —, então
 * a altura do texto é forjada aqui. O que o teste protege é a DECISÃO: mostrar o
 * "ver mais" só quando o recorte de três linhas esconde alguma coisa, e abrir o
 * diálogo com a descrição inteira e o botão de acesso do card.
 */
const CURSO = {
  courseId: "c1",
  title: "Curso de Algoritmos",
  description: "Uma introdução prática a estruturas de dados.",
};

let container;
let root;

const forjarAlturaDoTexto = ({ scrollHeight, clientHeight }) => {
  for (const propriedade of ["scrollHeight", "clientHeight"]) {
    Object.defineProperty(window.HTMLElement.prototype, propriedade, {
      configurable: true,
      get() {
        // Só o parágrafo recortado importa; o resto da árvore fica com 0.
        if (this.tagName !== "P") return 0;
        return propriedade === "scrollHeight" ? scrollHeight : clientHeight;
      },
    });
  }
};

const renderizar = (props) =>
  act(() => {
    root.render(<CourseDescription course={CURSO} {...props} />);
  });

const clicar = (elemento) =>
  act(() => {
    elemento.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  });

const porTexto = (texto) =>
  [...document.body.querySelectorAll("button")].find((b) => b.textContent.trim() === texto);

beforeEach(() => {
  window.ResizeObserver = class {
    observe() {}
    disconnect() {}
  };
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("CourseDescription", () => {
  it("não oferece 'ver mais' quando a descrição cabe nas três linhas", () => {
    forjarAlturaDoTexto({ scrollHeight: 60, clientHeight: 60 });
    renderizar();

    expect(porTexto("ver mais")).toBeUndefined();
  });

  it("oferece 'ver mais' quando o recorte esconde parte do texto", () => {
    forjarAlturaDoTexto({ scrollHeight: 200, clientHeight: 60 });
    renderizar();

    expect(porTexto("ver mais")).toBeDefined();
  });

  it("abre o diálogo com a descrição inteira, o X e o botão de acesso", async () => {
    forjarAlturaDoTexto({ scrollHeight: 200, clientHeight: 60 });
    const onAction = vi.fn();
    renderizar({ actionLabel: "Continuar", onAction });

    clicar(porTexto("ver mais"));

    const dialogo = document.body.querySelector('[role="dialog"]');
    expect(dialogo).toBeTruthy();
    expect(dialogo.textContent).toContain(CURSO.title);
    expect(dialogo.textContent).toContain(CURSO.description);
    expect(dialogo.querySelector('[aria-label="Fechar"]')).toBeTruthy();

    clicar(porTexto("Continuar"));
    expect(onAction).toHaveBeenCalledTimes(1);

    // O diálogo sai da árvore só depois da transição de fechamento do MUI.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 400));
    });
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  it("cai no texto padrão quando o curso não tem descrição", () => {
    forjarAlturaDoTexto({ scrollHeight: 60, clientHeight: 60 });
    renderizar({ course: { title: "Sem descrição" } });

    expect(container.textContent).toContain("Descrição do curso");
  });
});
