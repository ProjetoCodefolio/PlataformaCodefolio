// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";

// Sinaliza ao React 18 que os `act(...)` daqui são de teste.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/**
 * O componente fala com o banco; aqui o serviço inteiro é dublado e as threads
 * são entregues prontas. O que o teste protege são as duas decisões de
 * interface: as respostas ficam atrás de um botão próprio, e apagar passa por
 * uma confirmação antes de tocar no banco.
 */
const deleteVideoComment = vi.fn(() => Promise.resolve(true));
const listenToVideoComments = vi.fn();

vi.mock("$api/services/courses/videoComments", () => ({
  MAX_COMMENT_LENGTH: 1000,
  addVideoComment: vi.fn(() => Promise.resolve({})),
  canDeleteComment: () => true,
  countComments: (threads) =>
    (threads || []).reduce((total, raiz) => total + 1 + (raiz.replies?.length || 0), 0),
  deleteVideoComment: (...args) => deleteVideoComment(...args),
  listenToVideoComments: (...args) => listenToVideoComments(...args),
}));

vi.mock("$context/AuthContext", () => ({
  useAuth: () => ({ userDetails: { userId: "aluno1", role: "user" } }),
}));

vi.mock("react-toastify", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const VideoComments = (await import("./VideoComments.jsx")).default;

const THREADS = [
  {
    id: "c1",
    text: "No minuto 4:20 ficou claro pra mim",
    userId: "aluno1",
    userName: "Ana",
    userPhotoURL: "",
    createdAt: "2026-08-20T10:00:00.000Z",
    parentId: null,
    replies: [
      {
        id: "r1",
        text: "Também achei, obrigado",
        userId: "aluno2",
        userName: "Bruno",
        userPhotoURL: "",
        createdAt: "2026-08-20T11:00:00.000Z",
        parentId: "c1",
        replies: [],
      },
    ],
  },
];

let container;
let root;

const botaoPorTexto = (texto) =>
  [...document.body.querySelectorAll("button")].find((b) =>
    b.textContent.trim().includes(texto)
  );

const clicar = (elemento) =>
  act(() => {
    elemento.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  });

const abrirPainel = () => {
  act(() => {
    root.render(
      <VideoComments courseId="curso1" contentId="aula1" courseOwnerUid="prof1" />
    );
  });
  // O painel nasce recolhido; o cabeçalho é o que abre. Em ordem de documento o
  // wrapper externo vem primeiro e o cabeçalho depois — o clique precisa cair no
  // segundo, porque evento sobe, não desce.
  const candidatos = [...container.querySelectorAll("div")].filter((d) =>
    d.textContent.trim().startsWith("Comentários")
  );
  clicar(candidatos[candidatos.length - 1]);
};

beforeEach(() => {
  listenToVideoComments.mockImplementation((courseId, contentId, callback) => {
    callback(THREADS);
    return () => {};
  });
  deleteVideoComment.mockClear();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.body.innerHTML = "";
});

describe("VideoComments", () => {
  it("mantém as respostas escondidas atrás de um botão próprio", () => {
    abrirPainel();

    expect(container.textContent).toContain("No minuto 4:20");
    expect(container.textContent).not.toContain("Também achei");
    expect(botaoPorTexto("Ver 1 resposta")).toBeDefined();
  });

  it("mostra e esconde as respostas ao alternar", () => {
    abrirPainel();

    clicar(botaoPorTexto("Ver 1 resposta"));
    expect(container.textContent).toContain("Também achei");

    clicar(botaoPorTexto("Ocultar 1 resposta"));
    expect(botaoPorTexto("Ver 1 resposta")).toBeDefined();
  });

  it("não apaga nada antes da confirmação", () => {
    abrirPainel();

    const apagar = [...container.querySelectorAll("button")].find((b) =>
      b.getAttribute("title")?.startsWith("Remover comentário")
    );
    clicar(apagar);

    expect(deleteVideoComment).not.toHaveBeenCalled();
    expect(document.body.querySelector('[role="dialog"]')).toBeTruthy();
    expect(document.body.textContent).toContain("Não dá para desfazer");
  });

  it("cancelar fecha o modal sem apagar", async () => {
    abrirPainel();

    clicar(
      [...container.querySelectorAll("button")].find((b) =>
        b.getAttribute("title")?.startsWith("Remover comentário")
      )
    );
    clicar(botaoPorTexto("Cancelar"));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 400));
    });

    expect(deleteVideoComment).not.toHaveBeenCalled();
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  it("confirmar apaga o comentário e as respostas dele", () => {
    abrirPainel();

    clicar(
      [...container.querySelectorAll("button")].find((b) =>
        b.getAttribute("title")?.startsWith("Remover comentário")
      )
    );
    clicar(botaoPorTexto("Remover"));

    expect(deleteVideoComment).toHaveBeenCalledTimes(1);
    const [courseId, contentId, comentario] = deleteVideoComment.mock.calls[0];
    expect(courseId).toBe("curso1");
    expect(contentId).toBe("aula1");
    expect(comentario.id).toBe("c1");
  });

  it("avisa que as respostas vão junto quando a raiz tem respostas", () => {
    abrirPainel();

    clicar(
      [...container.querySelectorAll("button")].find((b) =>
        b.getAttribute("title")?.startsWith("Remover comentário")
      )
    );

    expect(document.body.textContent).toContain("1 resposta");
  });
});
