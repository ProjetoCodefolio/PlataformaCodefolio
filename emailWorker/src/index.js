import { createRemoteJWKSet, jwtVerify } from "jose";

// JWKS público do Firebase Auth (tokens de ID assinados pelo secureToken).
// Fica em cache pelo próprio `jose` entre invocações do mesmo Worker.
const FIREBASE_JWKS = createRemoteJWKSet(
  new URL(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
  )
);

// Só aceita pedidos de enfileirar e-mail vindos de um usuário autenticado no
// próprio app (evita que a URL do Worker, uma vez conhecida, seja usada para
// estourar a cota diária do Brevo ou mandar e-mail pra qualquer endereço).
async function verifyFirebaseToken(idToken, projectId) {
  const { payload } = await jwtVerify(idToken, FIREBASE_JWKS, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });
  return payload;
}

const todayKey = () => new Date().toISOString().slice(0, 10);

async function readDailyCount(env) {
  const raw = await env.EMAIL_META.get(`count:${todayKey()}`);
  return raw ? parseInt(raw, 10) : 0;
}

async function incrDailyCount(env, current) {
  await env.EMAIL_META.put(`count:${todayKey()}`, String(current + 1), {
    expirationTtl: 60 * 60 * 48,
  });
}

// Quantos avisos daquele curso ficaram esperando cota hoje. É o número que a
// tela de admin do curso mostra pro professor (GET /quota-status) — sem isso
// ele acha que a turma foi avisada na hora.
async function incrDeferred(env, courseId) {
  if (!courseId) return;
  const key = `deferred:${courseId}:${todayKey()}`;
  const raw = await env.EMAIL_META.get(key);
  const next = (raw ? parseInt(raw, 10) : 0) + 1;
  await env.EMAIL_META.put(key, String(next), { expirationTtl: 60 * 60 * 48 });
}

const APP_BASE_URL = "https://plataformacodefolio.web.app";

// Paleta do design system do app (src/theme.js) — mesma cor em todo lugar,
// pra o e-mail não parecer de outro produto.
const BRAND = {
  purple: "#9041C1",
  purpleDark: "#7D37A7",
  surface: "#F5F0FA",
  pageBg: "#F5F5FA",
  ink: "#1A1523",
  inkSecondary: "#5B5566",
  divider: "#E7E4EC",
};

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));

const HEADLINES = {
  new_quiz: "Novo quiz publicado",
  quiz_updated: "Quiz atualizado",
  new_assignment: "Novo enunciado publicado",
  assignment_updated: "Enunciado atualizado",
  new_assessment: "Nova avaliação cadastrada",
  assessment_updated: "Avaliação atualizada",
  group_changes: "Mudança no seu grupo",
};

// Ícone e rótulo de cada campo. O cliente só manda os valores (já formatados,
// porque quem sabe o fuso do usuário é o browser); a apresentação é toda daqui.
const FIELD_META = {
  videoTitle: { icon: "🎥", label: "Vídeo associado" },
  window: { icon: "⏰", label: "Janela" },
  // "Nota mínima" sozinho parecia contradizer "quiz diagnóstico": a mínima
  // vale para PASSAR no quiz (libera o próximo conteúdo) mesmo quando o quiz
  // não entra na média — são duas coisas diferentes e os rótulos precisam
  // deixar isso claro.
  minPercentage: { icon: "✅", label: "Nota mínima para passar" },
  attempts: { icon: "🔁", label: "Tentativas" },
  graded: { icon: "🧪", label: "Entra na média do curso" },
  dueDate: { icon: "📅", label: "Prazo de entrega" },
  weight: { icon: "⚖️", label: "Peso na média" },
  mode: { icon: "👥", label: "Modo" },
  action: { icon: "🔀", label: "O que aconteceu" },
  assignmentTitle: { icon: "📋", label: "Trabalho" },
  assessmentDescription: { icon: "📄", label: "Descrição" },
};

const FIELD_ORDER = {
  new_quiz: ["videoTitle", "window", "minPercentage", "attempts", "graded"],
  quiz_updated: ["videoTitle", "window", "minPercentage", "attempts", "graded"],
  new_assignment: ["dueDate", "weight", "mode"],
  assignment_updated: ["dueDate", "weight", "mode"],
  new_assessment: ["weight", "assessmentDescription"],
  assessment_updated: ["weight", "assessmentDescription"],
  group_changes: ["action", "assignmentTitle"],
};

// Teto do enunciado embutido. Gmail corta a mensagem inteira acima de ~102KB
// ("[Message clipped]"), então é melhor cortar de propósito e dizer onde ver o
// resto do que deixar o cliente cortar no meio.
const MAX_DESCRIPTION_HTML = 15000;

// O HTML do enunciado vem sanitizado do app, mas sem estilo nenhum — feito pra
// herdar o CSS da tela. Em e-mail não existe folha de estilo, então cada tag
// precisa do estilo inline ou sai com o default feio do cliente.
const TAG_STYLES = {
  h1: "margin:16px 0 8px; font-size:20px; line-height:1.3; color:" + BRAND.ink + ";",
  h2: "margin:16px 0 8px; font-size:18px; line-height:1.3; color:" + BRAND.ink + ";",
  h3: "margin:14px 0 6px; font-size:16px; line-height:1.3; color:" + BRAND.ink + ";",
  h4: "margin:14px 0 6px; font-size:15px; line-height:1.3; color:" + BRAND.ink + ";",
  p: "margin:0 0 12px; font-size:15px; line-height:1.6; color:" + BRAND.ink + ";",
  ul: "margin:0 0 12px; padding-left:22px;",
  ol: "margin:0 0 12px; padding-left:22px;",
  li: "margin:0 0 6px; font-size:15px; line-height:1.6; color:" + BRAND.ink + ";",
  a: "color:" + BRAND.purpleDark + "; text-decoration:underline;",
  code: "background-color:" + BRAND.surface + "; padding:2px 5px; border-radius:4px; font-family:ui-monospace,Menlo,Consolas,monospace; font-size:13px;",
  pre: "background-color:" + BRAND.surface + "; padding:12px; border-radius:8px; overflow-x:auto; font-family:ui-monospace,Menlo,Consolas,monospace; font-size:13px; line-height:1.5;",
  blockquote: "margin:0 0 12px; padding:8px 14px; border-left:3px solid " + BRAND.purple + "; color:" + BRAND.inkSecondary + ";",
  table: "border-collapse:collapse; width:100%; margin:0 0 12px; font-size:14px;",
  th: "border:1px solid " + BRAND.divider + "; padding:8px; text-align:left; background-color:" + BRAND.surface + ";",
  td: "border:1px solid " + BRAND.divider + "; padding:8px;",
  img: "max-width:100%; height:auto; border-radius:8px;",
};

function styleRichHtml(html) {
  let out = String(html ?? "");
  let truncated = false;

  if (out.length > MAX_DESCRIPTION_HTML) {
    const cut = out.slice(0, MAX_DESCRIPTION_HTML);
    // Corta num fim de tag pra não deixar markup pela metade no meio do e-mail.
    const lastClose = cut.lastIndexOf(">");
    out = lastClose > 0 ? cut.slice(0, lastClose + 1) : cut;
    truncated = true;
  }

  for (const [tag, style] of Object.entries(TAG_STYLES)) {
    out = out.replace(
      new RegExp(`<${tag}(\\s[^>]*)?>`, "gi"),
      (_match, attrs) => `<${tag}${attrs || ""} style="${style}">`
    );
  }

  if (truncated) {
    out += `<p style="margin:12px 0 0; font-size:13px; color:${BRAND.inkSecondary};"><em>Enunciado cortado por tamanho — veja a versão completa no app.</em></p>`;
  }
  return out;
}

const absoluteLink = (link) => (link ? `${APP_BASE_URL}${link}` : APP_BASE_URL);

function renderSubject({ type, courseTitle, itemTitle }) {
  const headline = HEADLINES[type] || "Novidade no curso";
  const curso = courseTitle ? `[${courseTitle}] ` : "";
  if (!itemTitle) return `${curso}${headline}`;
  // Gmail no celular corta perto de 40-70 chars; o que interessa (curso e tipo)
  // já passou, então o truncado só atinge o nome do item.
  const item =
    itemTitle.length > 40 ? `${itemTitle.slice(0, 39).trimEnd()}…` : itemTitle;
  return `${curso}${headline}: ${item}`;
}

function renderDetailBlock({ icon, label, value }) {
  return `
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;">
                  <tr>
                    <td style="padding:0 0 4px;">
                      <span style="font-size:14px;">${icon}</span>
                      <span style="color:${BRAND.inkSecondary}; font-size:11px; font-weight:700; letter-spacing:0.8px; text-transform:uppercase;">&nbsp;${escapeHtml(label)}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="color:${BRAND.ink}; font-size:15px; line-height:1.5; padding-left:22px;">
                      ${String(value)
                        .split("\n")
                        .map((line) => escapeHtml(line))
                        .join("<br />")}
                    </td>
                  </tr>
                </table>`;
}

function renderHtml(job) {
  const { type, courseTitle, name, link, changes, fields = {} } = job;
  const headline = HEADLINES[type] || "Novidade no curso";
  const greeting = name ? `, ${escapeHtml(name)}` : "";
  const order = FIELD_ORDER[type] || Object.keys(fields);

  const changesBlock =
    Array.isArray(changes) && changes.length
      ? renderDetailBlock({
          icon: "🔄",
          label: "O que mudou",
          value: changes.join(" · "),
        })
      : "";

  // Campo sem valor não vira bloco vazio: some.
  const detailBlocks = order
    .filter((key) => fields[key])
    .map((key) => renderDetailBlock({ ...FIELD_META[key], value: fields[key] }))
    .join("");

  const descriptionBlock = fields.descriptionHtml
    ? `
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;">
                  <tr>
                    <td style="padding:0 0 6px;">
                      <span style="font-size:14px;">📝</span>
                      <span style="color:${BRAND.inkSecondary}; font-size:11px; font-weight:700; letter-spacing:0.8px; text-transform:uppercase;">&nbsp;Enunciado</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:12px 16px; background-color:${BRAND.surface}; border-radius:8px;">
                      ${styleRichHtml(fields.descriptionHtml)}
                    </td>
                  </tr>
                </table>`
    : "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(headline)}</title>
  </head>
  <body style="margin:0; padding:0; background-color:${BRAND.pageBg}; font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.pageBg}; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px; background-color:#FFFFFF; border-radius:12px; overflow:hidden; border:1px solid ${BRAND.divider};">
            <tr>
              <td style="background-color:${BRAND.purple}; padding:24px 32px;">
                <span style="color:#FFFFFF; font-size:20px; font-weight:700; letter-spacing:0.2px;">Codefólio</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 32px 8px;">
                <p style="margin:0 0 20px; color:${BRAND.ink}; font-size:15px; line-height:1.5;">
                  Olá${greeting}!
                </p>
                <p style="margin:0 0 4px; color:${BRAND.ink}; font-size:19px; font-weight:700; line-height:1.3;">
                  ${escapeHtml(headline)}
                </p>
                <p style="margin:0 0 24px; color:${BRAND.inkSecondary}; font-size:14px;">
                  ${escapeHtml(courseTitle || "")}
                </p>
                ${changesBlock}
                ${detailBlocks}
                ${descriptionBlock}
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 12px;">
                  <tr>
                    <td style="background-color:${BRAND.purple}; border-radius:8px;">
                      <a href="${absoluteLink(link)}" style="display:inline-block; padding:12px 24px; color:#FFFFFF; font-size:14px; font-weight:600; text-decoration:none;">
                        Abrir no Codefólio
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px; border-top:1px solid ${BRAND.divider};">
                <p style="margin:0; color:${BRAND.inkSecondary}; font-size:12px; line-height:1.5;">
                  Você recebeu este e-mail porque está matriculado(a) em ${escapeHtml(courseTitle || "um curso")} no Codefólio. Dá pra desligar avisos desse tipo nas preferências de notificação do curso, dentro do app.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function renderText(job) {
  const { type, courseTitle, name, link, changes, fields = {} } = job;
  const headline = HEADLINES[type] || "Novidade no curso";
  const order = FIELD_ORDER[type] || Object.keys(fields);

  const lines = [`Olá${name ? `, ${name}` : ""}!`, "", headline];
  if (courseTitle) lines.push(courseTitle);
  lines.push("");

  if (Array.isArray(changes) && changes.length) {
    lines.push(`O que mudou: ${changes.join(" · ")}`, "");
  }

  order
    .filter((key) => fields[key])
    .forEach((key) => {
      lines.push(`${FIELD_META[key].label}: ${fields[key].replace(/\n/g, " | ")}`);
    });

  lines.push("", `Abrir no Codefólio: ${absoluteLink(link)}`);
  return lines.join("\n");
}

async function sendViaBrevo(env, job) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": env.BREVO_API_KEY,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: "Codefólio", email: env.BREVO_SENDER_EMAIL },
      to: [{ email: job.to, name: job.name || undefined }],
      subject: renderSubject(job),
      htmlContent: renderHtml(job),
      textContent: renderText(job),
    }),
  });

  const bodyText = await res.text();
  if (!res.ok) {
    throw new Error(`Brevo respondeu ${res.status}: ${bodyText}`);
  }
}

// O app chama isso via `fetch` do navegador (não server-to-server), então o
// browser manda um preflight OPTIONS antes de qualquer POST com header
// Authorization/JSON — sem responder isso com os headers certos, o POST nem
// sai. Sem `credentials: "include"` no fetch do app, "*" aqui é seguro (a
// autenticação de verdade é o token do Firebase, não a origem).
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

function withCors(response) {
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const isEnqueue = request.method === "POST" && url.pathname === "/enqueue";
    const isQuotaStatus =
      request.method === "GET" && url.pathname === "/quota-status";

    if (!isEnqueue && !isQuotaStatus) {
      return withCors(new Response("Not found", { status: 404 }));
    }

    const idToken = (request.headers.get("authorization") || "").replace(
      /^Bearer\s+/i,
      ""
    );
    if (!idToken) return withCors(new Response("Unauthorized", { status: 401 }));

    try {
      await verifyFirebaseToken(idToken, env.FIREBASE_PROJECT_ID);
    } catch {
      return withCors(new Response("Unauthorized", { status: 401 }));
    }

    if (isQuotaStatus) {
      const courseId = url.searchParams.get("courseId");
      if (!courseId) {
        return withCors(new Response("Missing courseId", { status: 400 }));
      }
      const raw = await env.EMAIL_META.get(`deferred:${courseId}:${todayKey()}`);
      return withCors(
        new Response(JSON.stringify({ deferred: raw ? parseInt(raw, 10) : 0 }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      );
    }

    let job;
    try {
      job = await request.json();
    } catch {
      return withCors(new Response("Bad request", { status: 400 }));
    }

    if (!job.to || !job.type) {
      return withCors(new Response("Missing fields", { status: 400 }));
    }

    await env.EMAIL_QUEUE.send({
      to: job.to,
      name: job.name || "",
      type: job.type,
      courseId: job.courseId || "",
      courseTitle: job.courseTitle || "",
      itemTitle: job.itemTitle || "",
      link: job.link || "",
      changes: Array.isArray(job.changes) ? job.changes : [],
      fields: job.fields && typeof job.fields === "object" ? job.fields : {},
    });

    return withCors(new Response("queued", { status: 202 }));
  },

  // Disparado automaticamente pela Cloudflare Queue a cada novo lote — não é
  // cron, é push. A cota diária do Brevo (free = 300/dia) é o único motivo
  // pra segurar uma mensagem em vez de mandar na hora.
  async queue(batch, env) {
    const limit = parseInt(env.BREVO_DAILY_LIMIT || "290", 10);

    for (const message of batch.messages) {
      const used = await readDailyCount(env);

      if (used >= limit) {
        // Nada se perde: volta pra fila e tenta de hora em hora até a cota
        // virar. O contador de adiados é o que o professor vê na tela do curso.
        await incrDeferred(env, message.body?.courseId);
        message.retry({ delaySeconds: 3600 });
        continue;
      }

      try {
        await sendViaBrevo(env, message.body);
        await incrDailyCount(env, used);
        message.ack();
      } catch (error) {
        console.error("Erro ao enviar via Brevo:", error);
        message.retry({ delaySeconds: 300 });
      }
    }
  },
};
