// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// `ensureQuestionIds` vive no módulo de CRUD, que importa o config do Firebase.
vi.mock("$api/config/firebase", () => ({ database: {}, auth: {}, analytics: {} }));

const { default: QuestionList } = await import("./QuestionList.jsx");
const { ensureQuestionIds } = await import("$api/services/courses/quizQuestions");

const questao = (numero, extras = {}) => ({
  question: `Pergunta ${numero}`,
  questionType: "multiple-choice",
  options: [`A${numero}`, `B${numero}`],
  correctOption: 0,
  ...extras,
});

/**
 * Digita num campo do jeito que o React enxerga como digitação real.
 */
const digitar = (input, valor) => {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value"
  ).set;
  setter.call(input, valor);
  input.dispatchEvent(new Event("input", { bubbles: true }));
};

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

const montar = (questions, onAutoSaveQuestion) =>
  act(() => {
    root.render(
      <QuestionList
        quiz={{ videoId: "vid1", minPercentage: 60, questions }}
        handleEditQuestion={() => {}}
        handleRemoveQuestion={() => {}}
        courseId="curso1"
        onAutoSaveQuestion={onAutoSaveQuestion}
        onReorderQuestions={() => {}}
      />
    );
  });

const enunciadosEmEdicao = () =>
  [...container.querySelectorAll("input")]
    .map((i) => i.value)
    .filter((v) => v.startsWith("Pergunta"));

/**
 * O editor inline guarda um rascunho POR QUESTÃO, chaveado pelo id. A garantia
 * testada aqui é a que quebra de forma escandalosa quando o id falta ou se
 * repete: abrir a edição de uma questão abria a de todas, e o que se digitava
 * numa aparecia em todas (sem nunca salvar, porque a gravação exige um id).
 */
describe("QuestionList: edição inline de uma questão", () => {
  it("só mexe na questão editada", async () => {
    const onAutoSaveQuestion = vi.fn(() => Promise.resolve());
    const questions = [questao(1, { id: "q-um" }), questao(2, { id: "q-dois" }), questao(3, { id: "q-tres" })];

    await montar(questions, onAutoSaveQuestion);

    const editar = [...container.querySelectorAll('[title="Editar questão"]')];
    await act(async () => editar[1].click());

    // Um único editor aberto, o da segunda questão.
    expect(enunciadosEmEdicao()).toEqual(["Pergunta 2"]);

    await act(async () => {
      digitar(
        [...container.querySelectorAll("input")].find((i) => i.value === "Pergunta 2"),
        "Pergunta 2 editada"
      );
    });

    expect(enunciadosEmEdicao()).toEqual(["Pergunta 2 editada"]);
    // As outras continuam intactas na lista.
    expect(container.textContent).toContain("Pergunta 1");
    expect(container.textContent).toContain("Pergunta 3");

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 900));
    });

    expect(onAutoSaveQuestion).toHaveBeenCalledTimes(1);
    expect(onAutoSaveQuestion.mock.calls[0][1]).toMatchObject({
      id: "q-dois",
      question: "Pergunta 2 editada",
    });
  });

  it("idem para um quiz antigo, cujas questões chegam sem id do banco", async () => {
    const onAutoSaveQuestion = vi.fn(() => Promise.resolve());
    // Exatamente o que a leitura faz antes de a lista virar estado de tela.
    const questions = ensureQuestionIds([questao(1), questao(2), questao(3)]);

    await montar(questions, onAutoSaveQuestion);

    const editar = [...container.querySelectorAll('[title="Editar questão"]')];
    await act(async () => editar[0].click());

    expect(enunciadosEmEdicao()).toEqual(["Pergunta 1"]);

    await act(async () => {
      digitar(
        [...container.querySelectorAll("input")].find((i) => i.value === "Pergunta 1"),
        "Pergunta 1 editada"
      );
    });

    expect(enunciadosEmEdicao()).toEqual(["Pergunta 1 editada"]);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 900));
    });

    expect(onAutoSaveQuestion).toHaveBeenCalledTimes(1);
    expect(onAutoSaveQuestion.mock.calls[0][1].id).toBeTruthy();
    expect(onAutoSaveQuestion.mock.calls[0][1].question).toBe("Pergunta 1 editada");
  });
});
