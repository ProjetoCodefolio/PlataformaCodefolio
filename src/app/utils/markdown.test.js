// @vitest-environment jsdom
// A conversão usa DOMParser (sanitização por whitelist), então este arquivo
// roda em jsdom — o restante da suíte segue em ambiente node.
import { describe, it, expect } from "vitest";
import { markdownToHtml, markdownIsEmpty, htmlToMarkdown } from "./markdown";

describe("markdownToHtml", () => {
  it("devolve '' para vazio/inválido", () => {
    expect(markdownToHtml("")).toBe("");
    expect(markdownToHtml(null)).toBe("");
    expect(markdownToHtml(undefined)).toBe("");
  });

  it("renderiza a formatação básica do enunciado", () => {
    const html = markdownToHtml("## Objetivo\n\nEntregar o **relatório** em *PDF*.");
    expect(html).toContain("<h2>Objetivo</h2>");
    expect(html).toContain("<strong>relatório</strong>");
    expect(html).toContain("<em>PDF</em>");
  });

  it("renderiza listas, citação e tabela (GFM)", () => {
    expect(markdownToHtml("- um\n- dois")).toContain("<li>um</li>");
    expect(markdownToHtml("1. um\n2. dois")).toContain("<ol>");
    expect(markdownToHtml("> atenção ao prazo")).toContain("<blockquote>");
    const table = markdownToHtml("| a | b |\n| - | - |\n| 1 | 2 |");
    expect(table).toContain("<table>");
    expect(table).toContain("<th>a</th>");
  });

  it("renderiza código inline e bloco de código", () => {
    expect(markdownToHtml("use `npm test`")).toContain("<code>npm test</code>");
    const block = markdownToHtml("```js\nlet x = 1;\n```");
    expect(block).toContain("<pre>");
    expect(block).toContain("let x = 1;");
  });

  it("quebra de linha simples vira <br> (breaks)", () => {
    expect(markdownToHtml("linha 1\nlinha 2")).toContain("<br>");
  });

  it("mantém link seguro com target/rel e descarta esquema perigoso", () => {
    const ok = markdownToHtml("[docs](https://exemplo.com)");
    expect(ok).toContain('href="https://exemplo.com"');
    expect(ok).toContain('rel="noopener noreferrer"');
    const bad = markdownToHtml("[clique](javascript:alert(1))");
    expect(bad).not.toContain("javascript:");
    expect(bad).toContain("clique");
  });

  it("remove HTML perigoso embutido no markdown", () => {
    const html = markdownToHtml('texto\n\n<script>alert(1)</script>\n\n<img src=x onerror="alert(1)">');
    expect(html).not.toContain("<script");
    expect(html).not.toContain("onerror");
    expect(html).toContain("texto");
  });

  it("mantém imagem de origem confiável e descarta as demais", () => {
    expect(markdownToHtml("![g](https://exemplo.com/g.png)")).toContain('src="https://exemplo.com/g.png"');
    expect(markdownToHtml("![g](javascript:alert(1))")).not.toContain("<img");
  });
});

describe("markdownIsEmpty", () => {
  it("considera vazio o que só tem espaço em branco", () => {
    expect(markdownIsEmpty("")).toBe(true);
    expect(markdownIsEmpty("   \n  ")).toBe(true);
    expect(markdownIsEmpty(null)).toBe(true);
    expect(markdownIsEmpty("# oi")).toBe(false);
  });
});

describe("htmlToMarkdown (migração dos enunciados antigos)", () => {
  it("devolve '' para vazio", () => {
    expect(htmlToMarkdown("")).toBe("");
    expect(htmlToMarkdown(null)).toBe("");
  });

  it("converte a formatação produzida pelo editor antigo", () => {
    expect(htmlToMarkdown("<p>Olá <b>turma</b></p>")).toBe("Olá **turma**");
    expect(htmlToMarkdown("<p><i>itálico</i></p>")).toBe("*itálico*");
    expect(htmlToMarkdown("<p><s>fora</s></p>")).toBe("~~fora~~");
    expect(htmlToMarkdown("<h3>Título</h3>")).toBe("### Título");
    expect(htmlToMarkdown("<blockquote>nota</blockquote>")).toBe("> nota");
  });

  it("converte listas e links", () => {
    expect(htmlToMarkdown("<ul><li>um</li><li>dois</li></ul>")).toBe("- um\n- dois");
    expect(htmlToMarkdown("<ol><li>um</li><li>dois</li></ol>")).toBe("1. um\n1. dois");
    expect(htmlToMarkdown('<p><a href="https://e.com">site</a></p>')).toBe("[site](https://e.com)");
  });

  it("separa parágrafos em blocos e sobrevive ao round-trip", () => {
    const md = htmlToMarkdown("<p>Primeiro</p><p>Segundo</p>");
    expect(md).toBe("Primeiro\n\nSegundo");
    const html = markdownToHtml(md);
    expect(html).toContain("<p>Primeiro</p>");
    expect(html).toContain("<p>Segundo</p>");
  });

  it("texto puro legado passa sem alteração", () => {
    expect(htmlToMarkdown("enunciado simples")).toBe("enunciado simples");
  });
});
