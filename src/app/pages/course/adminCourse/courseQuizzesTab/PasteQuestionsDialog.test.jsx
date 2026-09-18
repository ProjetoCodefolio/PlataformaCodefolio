// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// O parser puxa a resolução de gabarito do cliente da Question API, que
// importa o config do Firebase pela cadeia de constantes.
vi.mock("$api/config/firebase", () => ({ database: {}, auth: {}, analytics: {} }));

const { default: PasteQuestionsDialog } = await import("./PasteQuestionsDialog.jsx");

const digitar = (input, valor) => {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    "value"
  ).set;
  setter.call(input, valor);
  input.dispatchEvent(new Event("input", { bubbles: true }));
};

const clicar = (elemento) =>
  elemento.dispatchEvent(new MouseEvent("click", { bubbles: true }));

const botao = (rotulo) =>
  [...document.body.querySelectorAll("button")].find((b) =>
    b.textContent.includes(rotulo)
  );

const textarea = () => document.body.querySelector("textarea");

let container;
let root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const render = (props) =>
  act(() => {
    root.render(
      <PasteQuestionsDialog
        open
        onClose={() => {}}
        onQuestionsParsed={() => {}}
        {...props}
      />
    );
  });

const JSON_VALIDO = JSON.stringify([
  { question: "Capital da França?", options: ["Paris", "Roma"], correctOption: 0 },
  { question: "Capital da Itália?", options: ["Paris", "Roma"], correct_answer: "B" },
]);

describe("PasteQuestionsDialog", () => {
  it("entrega as questões conferidas para a área de conferência e fecha", () => {
    const onQuestionsParsed = vi.fn();
    const onClose = vi.fn();
    render({ onQuestionsParsed, onClose });

    act(() => digitar(textarea(), JSON_VALIDO));
    act(() => clicar(botao("Conferir")));

    expect(onQuestionsParsed).toHaveBeenCalledTimes(1);
    const questoes = onQuestionsParsed.mock.calls[0][0];
    expect(questoes).toHaveLength(2);
    expect(questoes[0].question).toBe("Capital da França?");
    expect(questoes[1].correctOption).toBe(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("não importa nada e mostra o erro posicional quando uma questão está errada", () => {
    const onQuestionsParsed = vi.fn();
    const onClose = vi.fn();
    render({ onQuestionsParsed, onClose });

    const comErro = JSON.stringify([
      { question: "Válida", options: ["A", "B"], correctOption: 0 },
      { question: "Gabarito fora do intervalo", options: ["A", "B"], correctOption: 9 },
    ]);

    act(() => digitar(textarea(), comErro));
    act(() => clicar(botao("Conferir")));

    expect(onQuestionsParsed).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("Nada foi importado");
    expect(document.body.textContent).toContain("Questão 2");
  });

  it("mantém o botão de conferir desabilitado enquanto nada foi colado", () => {
    render({});
    expect(botao("Conferir").disabled).toBe(true);
  });

  it("limpa o que foi colado ao cancelar", () => {
    const onClose = vi.fn();
    render({ onClose });

    act(() => digitar(textarea(), JSON_VALIDO));
    act(() => clicar(botao("Cancelar")));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(textarea().value).toBe("");
  });
});
