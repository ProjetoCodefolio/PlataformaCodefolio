#!/usr/bin/env node
/**
 * Confere que o build de produção (dist/) não carrega nada que só existe para
 * os testes E2E: a conexão com os emuladores, o atalho de login e a trava de
 * localhost.
 *
 * Esse código fica atrás de `VITE_MODE === "e2e"` (ver
 * src/api/config/runtimeMode.js) e o Vite o apaga do build de produção, mas
 * só enquanto consegue calcular essa condição na hora do build. Uma mudança
 * inocente (chamar a mesma função de dois lugares, por exemplo) já basta para
 * ele desistir e deixar o código lá dentro. Em produção esse código não roda,
 * porque o modo é `production`, mas não deveria nem estar lá.
 *
 * Uso: `npm run build && npm run check:build` (sai com código 1 se achar
 * algo). Aceita outra pasta como argumento: `node scripts/checkProductionBuild.mjs dist-x`.
 */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

// Cada marca é um texto que só aparece no bundle se o código do e2e sobrou.
const MARCAS = [
  { texto: "__codefolioE2E", o_que_e: "atalho de login dos testes E2E" },
  { texto: "127.0.0.1:9099", o_que_e: "conexão com o emulador de Auth" },
  { texto: "build de testes E2E", o_que_e: "trava de localhost do build e2e" },
  { texto: "e2e-fake-api-key", o_que_e: "configuração falsa do .env.e2e" },
  { texto: "Conectando ao Firebase Emulator", o_que_e: "conexão com o emulador do banco" },
];

const pasta = process.argv[2] || "dist";

const listarJs = async (dir) => {
  const entradas = await readdir(dir, { withFileTypes: true, recursive: true });
  return entradas
    .filter((e) => e.isFile() && e.name.endsWith(".js"))
    .map((e) => join(e.parentPath ?? e.path, e.name));
};

const arquivos = await listarJs(pasta).catch(() => []);
if (arquivos.length === 0) {
  console.error(`Nenhum .js em ${pasta}/. Rode \`npm run build\` antes.`);
  process.exit(1);
}

const achados = [];
for (const arquivo of arquivos) {
  const conteudo = await readFile(arquivo, "utf8");
  for (const marca of MARCAS) {
    if (conteudo.includes(marca.texto)) achados.push({ arquivo, ...marca });
  }
}

if (achados.length > 0) {
  console.error(`O build em ${pasta}/ tem código que só deveria existir no build e2e:`);
  for (const { arquivo, texto, o_que_e } of achados) {
    console.error(`  - ${o_que_e} ("${texto}") em ${arquivo}`);
  }
  process.exit(1);
}

console.log(`Build em ${pasta}/ limpo: ${arquivos.length} arquivos .js, nenhum resto do e2e.`);
