import { describe, it, expect } from "vitest";
import {
  buildContentNotification,
  buildQuizNotification,
  formatDateTime,
  quizEmailFields,
  recipientName,
  TURMA_TIME_ZONE,
} from "./notificationText.js";

const NOW = new Date("2026-03-01T12:00:00.000Z");

describe("buildContentNotification", () => {
  it("vídeo e slide têm títulos próprios e link para o item", () => {
    const video = buildContentNotification({
      courseId: "c1",
      content: { id: "v1", title: "Aula 1", category: "video" },
    });
    expect(video).toEqual({
      type: "new_content",
      courseId: "c1",
      title: "Novo vídeo publicado",
      message: "Aula 1",
      link: "/classes?courseId=c1&videoId=v1",
    });
    const slide = buildContentNotification({
      courseId: "c1",
      content: { id: "s1", category: "slide" },
      courseTitle: "POO",
    });
    expect(slide.title).toBe("Novo slide publicado");
    expect(slide.message).toBe("POO: Slide");
  });
});

describe("buildQuizNotification", () => {
  it("quiz novo: sino e e-mail com os mesmos dados", () => {
    const n = buildQuizNotification({
      courseId: "c1",
      quiz: { id: "slide_s1", title: "Quiz 1", minPercentage: 70 },
      courseTitle: "POO",
      now: NOW,
    });
    expect(n.title).toBe("Novo quiz publicado");
    expect(n.message).toBe("POO: Quiz 1. Já está disponível.");
    expect(n.link).toBe("/classes?courseId=c1&videoId=s1");
    expect(n.email.type).toBe("new_quiz");
    expect(n.email.fields.minPercentage).toBe("70%");
  });

  it("alteração vira quiz_updated", () => {
    const n = buildQuizNotification({
      courseId: "c1",
      quiz: { id: "q" },
      changes: ["Prazo"],
      now: NOW,
    });
    expect(n.title).toBe("Quiz atualizado");
    expect(n.email.type).toBe("quiz_updated");
    expect(n.email.changes).toEqual(["Prazo"]);
  });

  it("no fuso da turma, a data sai como o professor vê no Brasil", () => {
    const quiz = { id: "q", closeDate: "2026-03-10T02:30:00.000Z" };
    const n = buildQuizNotification({ courseId: "c", quiz, now: NOW, timeZone: TURMA_TIME_ZONE });
    expect(n.message).toContain("09/03/2026");
    expect(n.message).toContain("23:30");
    expect(quizEmailFields(quiz, { timeZone: TURMA_TIME_ZONE }).window).toBe(
      `Encerra ${formatDateTime(quiz.closeDate, TURMA_TIME_ZONE)}`
    );
  });
});

describe("recipientName", () => {
  it("prefere `name` do perfil e cai no nome derivado", () => {
    expect(recipientName("u1", { name: "Ana", displayName: "Ana B" })).toBe("Ana");
    expect(recipientName("u1", { firstName: "Bia", lastName: "C" })).toBe("Bia C");
    expect(recipientName("u1", { email: "caio@x.com" })).toBe("caio");
  });
});
