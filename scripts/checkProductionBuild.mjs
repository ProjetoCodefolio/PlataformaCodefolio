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
 * As marcas abaixo são textos copiados do código do e2e. Se alguém reescrever
 * uma mensagem, a marca antiga deixa de existir e a checagem da produção
 * passaria sem conferir nada. Por isso o mesmo script roda também ao contrário,
 * no build e2e, onde todas as marcas TÊM que aparecer: marca que sumiu de lá
 * reprova e pede para atualizar a lista.
 *
 * Uso:
 *   npm run build && npm run check:build          (dist/ sem nenhuma marca)
 *   npm run build:e2e && npm run check:build:e2e  (dist-e2e/ com todas)
 * Sai com código 1 se algo estiver errado. Aceita outra pasta como argumento:
 * `node scripts/checkProductionBuild.mjs [--e2e] dist-x`.
 */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

// Cada marca é um texto que só aparece no bundle se o código do e2e sobrou.
const MARCAS = [
  { texto: "__codefolioE2E", descricao: "atalho de login dos testes E2E" },
  { texto: "127.0.0.1:9099", descricao: "conexão com o emulador de Auth" },
  { texto: "build de testes E2E", descricao: "trava de localhost do build e2e" },
  { texto: "e2e-fake-api-key", descricao: "configuração falsa do .env.e2e" },
  { texto: "Conectando ao Firebase Emulator", descricao: "conexão com o emulador do banco" },
];

const args = process.argv.slice(2);
const buildE2e = args.includes("--e2e");
const pasta = args.find((a) => !a.startsWith("--")) || (buildE2e ? "dist-e2e" : "dist");

const listarJs = async (dir) => {
  const entradas = await readdir(dir, { withFileTypes: true, recursive: true });
  return entradas
    .filter((e) => e.isFile() && e.name.endsWith(".js"))
    .map((e) => join(e.parentPath ?? e.path, e.name));
};

const arquivos = await listarJs(pasta).catch(() => []);
if (arquivos.length === 0) {
  const build = buildE2e ? "npm run build:e2e" : "npm run build";
  console.error(`Nenhum .js em ${pasta}/. Rode \`${build}\` antes.`);
  process.exit(1);
}

const achados = [];
for (const arquivo of arquivos) {
  const conteudo = await readFile(arquivo, "utf8");
  for (const marca of MARCAS) {
    if (conteudo.includes(marca.texto)) achados.push({ arquivo, ...marca });
  }
}

if (buildE2e) {
  const faltando = MARCAS.filter((marca) => !achados.some((a) => a.texto === marca.texto));
  if (faltando.length > 0) {
    console.error(
      `O build e2e em ${pasta}/ não tem estas marcas, então a checagem da produção não as enxerga mais.` +
        " Atualize a lista MARCAS em scripts/checkProductionBuild.mjs com o texto novo:"
    );
    for (const { texto, descricao } of faltando) console.error(`  - ${descricao} ("${texto}")`);
    process.exit(1);
  }
  console.log(`Build e2e em ${pasta}/ tem as ${MARCAS.length} marcas: a checagem da produção está valendo.`);
  process.exit(0);
}

if (achados.length > 0) {
  console.error(`O build em ${pasta}/ tem código que só deveria existir no build e2e:`);
  for (const { arquivo, texto, descricao } of achados) {
    console.error(`  - ${descricao} ("${texto}") em ${arquivo}`);
  }
  process.exit(1);
}

console.log(`Build em ${pasta}/ limpo: ${arquivos.length} arquivos .js, nenhum resto do e2e.`);
