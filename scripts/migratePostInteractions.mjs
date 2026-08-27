#!/usr/bin/env node
// Migração das interações do feed para folhas com dono.
//
// Até a correção, curtidas e comentários eram LISTAS reescritas por inteiro
// dentro do post:
//
//   post/{postId}/likes       = [ { uidUsuario, nome, data }, ... ]
//   post/{postId}/dislikes    = [ ... ]
//   post/{postId}/comentarios = [ { uidUsuario, nome, comentario, ... }, ... ]
//
// Formato que as regras não conseguem proteger por dono (quem pudesse escrever
// a lista podia reescrever a dos outros) e que perdia interações simultâneas.
// Agora cada uma é uma folha própria:
//
//   post/{postId}/likes/{uid}          = { nome, data }
//   post/{postId}/dislikes/{uid}       = { nome, data }
//   post/{postId}/comentarios/{pushId} = { uidUsuario, nome, comentario, ... }
//
// IMPORTANTE: rode esta migração JUNTO com o deploy das novas regras. Enquanto
// um post estiver no formato antigo, quem já tinha curtido não consegue mais
// descurtir — a curtida velha mora em `likes/0`, e a regra nova só deixa a
// pessoa escrever em `likes/{seu uid}`.
//
// Uso:
//   # dry-run (não escreve nada) — comece SEMPRE por aqui
//   GOOGLE_APPLICATION_CREDENTIALS=./sa.json node scripts/migratePostInteractions.mjs
//   # aplicar
//   GOOGLE_APPLICATION_CREDENTIALS=./sa.json node scripts/migratePostInteractions.mjs --apply
//   # no emulador
//   FIREBASE_DATABASE_EMULATOR_HOST=127.0.0.1:9000 node scripts/migratePostInteractions.mjs --apply
//
// Flags:
//   --apply   grava as mudanças (sem isto, apenas simula)

import { initAdminDb } from "./lib/firebaseAdmin.mjs";

const args = process.argv.slice(2);
const apply = args.includes("--apply");

const { db, mode } = initAdminDb();

console.log(`\nMigração das interações do feed — ${mode}`);
console.log(apply ? "MODO: aplicar\n" : "MODO: simulação (use --apply para gravar)\n");

/** Um nó já está migrado quando nenhuma chave é índice de lista ("0", "1", ...). */
const ehListaAntiga = (no) =>
  !!no && typeof no === "object" && Object.keys(no).some((chave) => /^\d+$/.test(chave));

const ordemNumerica = (a, b) => Number(a) - Number(b);

/**
 * Reindexa curtidas pelo uid de quem curtiu. Registros repetidos do mesmo uid
 * (efeito colateral das listas reescritas em paralelo) colapsam num só, e os que
 * chegaram sem uidUsuario são descartados — não há como devolvê-los a um dono.
 */
const migrarCurtidas = (lista) => {
  const mapa = {};
  let orfaos = 0;

  for (const registro of Object.values(lista)) {
    if (!registro || typeof registro !== "object") continue;
    const { uidUsuario, ...resto } = registro;
    if (!uidUsuario) {
      orfaos += 1;
      continue;
    }
    mapa[uidUsuario] = { nome: resto.nome || "", data: resto.data || "" };
  }

  return { mapa, orfaos };
};

/**
 * Reindexa comentários por chave `push`, gerada na ordem original da lista — as
 * chaves do push são crescentes no tempo, então a sequência é preservada.
 */
const migrarComentarios = (lista, postId) => {
  const mapa = {};

  const chavesEmOrdem = Object.keys(lista).sort(ordemNumerica);
  for (const indice of chavesEmOrdem) {
    const registro = lista[indice];
    if (!registro || typeof registro !== "object") continue;
    if (typeof registro.comentario !== "string" || registro.comentario.length === 0) continue;

    const chave = db.ref(`post/${postId}/comentarios`).push().key;
    mapa[chave] = {
      uidUsuario: registro.uidUsuario || "",
      nome: registro.nome || "",
      comentario: registro.comentario.slice(0, 1000),
      data: registro.data || "",
      foto: registro.foto || "",
    };
  }

  return mapa;
};

const postsSnap = await db.ref("post").get();

if (!postsSnap.exists()) {
  console.log("Nada a migrar: o nó post não existe.\n");
  process.exit(0);
}

const updates = {};
let postsTocados = 0;
let curtidasMigradas = 0;
let comentariosMigrados = 0;
let orfaosDescartados = 0;

for (const [postId, post] of Object.entries(postsSnap.val() || {})) {
  if (!post || typeof post !== "object") continue;

  const mudancas = [];

  for (const campo of ["likes", "dislikes"]) {
    if (!ehListaAntiga(post[campo])) continue;

    const { mapa, orfaos } = migrarCurtidas(post[campo]);
    updates[`post/${postId}/${campo}`] = Object.keys(mapa).length > 0 ? mapa : null;
    curtidasMigradas += Object.keys(mapa).length;
    orfaosDescartados += orfaos;
    mudancas.push(
      `${campo}: ${Object.keys(post[campo]).length} → ${Object.keys(mapa).length}` +
        (orfaos > 0 ? ` (${orfaos} sem dono, descartado[s])` : "")
    );
  }

  if (ehListaAntiga(post.comentarios)) {
    const mapa = migrarComentarios(post.comentarios, postId);
    updates[`post/${postId}/comentarios`] = Object.keys(mapa).length > 0 ? mapa : null;
    comentariosMigrados += Object.keys(mapa).length;
    mudancas.push(
      `comentarios: ${Object.keys(post.comentarios).length} → ${Object.keys(mapa).length}`
    );
  }

  if (mudancas.length > 0) {
    postsTocados += 1;
    console.log(`  ${postId} — ${mudancas.join("; ")}`);
  }
}

console.log(
  `\nResumo: ${postsTocados} post(s) a migrar, ${curtidasMigradas} curtida(s) e ` +
    `${comentariosMigrados} comentário(s) reindexados` +
    (orfaosDescartados > 0 ? `, ${orfaosDescartados} registro(s) sem dono descartado(s)` : "") +
    "."
);

if (postsTocados === 0) {
  console.log("Nada a gravar: todos os posts já estão no formato novo.\n");
  process.exit(0);
}

if (!apply) {
  console.log("Nada foi gravado (simulação).\n");
  process.exit(0);
}

await db.ref().update(updates);
console.log("Migração aplicada.\n");
process.exit(0);
