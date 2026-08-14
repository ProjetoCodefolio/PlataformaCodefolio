// Lógica PURA de presença (frequência) por vídeos assistidos — sem Firebase.
//
// Regra (definida pelo professor):
//  - Cada vídeo-aula assistido conta como presença. O limiar de "assistido" é
//    90% (o mesmo já usado no resto da plataforma, `videoProgress.js`).
//  - Cada vídeo assistido vale `presencesPerVideo` presenças. Esse valor é
//    CONFIGURÁVEL por curso (ex.: 4), pois muda conforme o contexto/disciplina.
//  - Presença % = vídeos assistidos / total de vídeos-aula.
//
// Segue a mesma separação usada nas notas/auditoria (cálculo puro vs. acesso ao
// banco): o IO vive em `attendanceData.js` e delega o cálculo para cá, o que
// mantém estas funções testáveis sem emulador.

/** Limiar padrão (%) para considerar um vídeo assistido. */
export const DEFAULT_WATCHED_THRESHOLD = 90;

/** Valor padrão de presenças que cada vídeo assistido concede. */
export const DEFAULT_PRESENCES_PER_VIDEO = 1;

/**
 * Um vídeo conta como assistido quando o percentual salvo atinge o limiar.
 * Usa `percentageWatched` como fonte primária; na ausência dele, cai para o
 * flag `watched` (que a plataforma grava a partir de >= 90%).
 * @param {Object|null} node - nó de videoProgress do aluno para o vídeo
 * @param {number} threshold - limiar em % (padrão 90)
 * @returns {boolean}
 */
export const isVideoWatched = (node, threshold = DEFAULT_WATCHED_THRESHOLD) => {
  if (!node || typeof node !== "object") return false;
  const pct =
    typeof node.percentageWatched === "number"
      ? node.percentageWatched
      : node.watched === true
        ? 90
        : 0;
  return pct >= threshold;
};

/**
 * Resolve a data de "assistido" de um nó de progresso, junto da sua procedência.
 *
 * Existem duas gerações do dado convivendo no banco, e a diferença importa:
 *  - `watchedAt` é gravado uma única vez, na travessia dos 90%, e nunca
 *    reescrito — é a data medida da conclusão ("medido");
 *  - `lastUpdated` é a última gravação de progresso. Coincide com a conclusão
 *    para quem assistiu uma vez e não voltou, mas caminhos antigos o moviam ao
 *    reabrir o vídeo. Serve como aproximação ("estimado").
 *
 * Resolver na LEITURA (em vez de preencher `watchedAt` retroativamente) dá
 * valor para todo registro sem misturar, no mesmo campo, o que foi medido com o
 * que foi inferido.
 *
 * @param {Object|null} node - nó de videoProgress do aluno para o vídeo
 * @returns {{data: string, origem: "medido"|"estimado"|""}}
 */
export const resolveWatchedDate = (node) => {
  if (!node || typeof node !== "object") return { data: "", origem: "" };
  if (typeof node.watchedAt === "string" && node.watchedAt) {
    return { data: node.watchedAt, origem: "medido" };
  }
  if (typeof node.lastUpdated === "string" && node.lastUpdated) {
    return { data: node.lastUpdated, origem: "estimado" };
  }
  return { data: "", origem: "" };
};

/**
 * Formata uma data ISO para leitura no relatório/CSV (pt-BR, curta).
 * Devolve "" para valor ausente ou inválido.
 * @param {string} iso
 * @returns {string}
 */
export const formatWatchedDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
};

/**
 * Calcula a presença de UM aluno a partir da lista de vídeos-aula do curso e do
 * seu progresso (id do vídeo → nó de videoProgress).
 * @param {Array<{id:string, title?:string}>} videos - vídeos-aula do curso
 * @param {Object} progressById - id → nó de videoProgress do aluno
 * @param {{presencesPerVideo?:number, threshold?:number}} opts
 * @returns {{
 *   perVideo: Array<{id:string,title:string,percentageWatched:number,watchedTimeInSeconds:number,watched:boolean}>,
 *   totalVideos:number, watchedCount:number, presences:number, maxPresences:number, presencePercent:number
 * }}
 */
export const computeStudentPresence = (
  videos = [],
  progressById = {},
  { presencesPerVideo = DEFAULT_PRESENCES_PER_VIDEO, threshold = DEFAULT_WATCHED_THRESHOLD } = {}
) => {
  const perVideo = (Array.isArray(videos) ? videos : []).map((v) => {
    const node = (progressById && progressById[v.id]) || null;
    const percentageWatched =
      node && typeof node.percentageWatched === "number" ? node.percentageWatched : 0;
    const watchedTimeInSeconds =
      node && typeof node.watchedTimeInSeconds === "number" ? node.watchedTimeInSeconds : 0;
    const { data: dataAssistido, origem: origemData } = resolveWatchedDate(node);
    return {
      id: v.id,
      title: v.title || "Vídeo sem título",
      percentageWatched,
      watchedTimeInSeconds,
      watched: isVideoWatched(node, threshold),
      dataAssistido,
      origemData,
    };
  });

  const totalVideos = perVideo.length;
  const watchedCount = perVideo.filter((p) => p.watched).length;
  const presences = watchedCount * presencesPerVideo;
  const maxPresences = totalVideos * presencesPerVideo;
  const presencePercent = totalVideos > 0 ? (watchedCount / totalVideos) * 100 : 0;

  return {
    perVideo,
    totalVideos,
    watchedCount,
    presences,
    maxPresences,
    presencePercent: Math.round(presencePercent * 100) / 100,
  };
};

/**
 * Calcula a presença de todos os alunos.
 * @param {Array<{userId:string, name?:string, email?:string, progressById?:Object}>} students
 * @param {Array<{id:string, title?:string}>} videos
 * @param {{presencesPerVideo?:number, threshold?:number}} opts
 * @returns {Array} cada aluno com os campos de presença calculados
 */
export const computeCoursePresence = (students = [], videos = [], opts = {}) =>
  (Array.isArray(students) ? students : []).map((student) => {
    const presence = computeStudentPresence(videos, student.progressById || {}, opts);
    return {
      userId: student.userId,
      name: student.name || "",
      email: student.email || "",
      ...presence,
    };
  });

/** Escapa um campo para CSV (aspas duplas dobradas), como nos demais exports. */
const csvCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

/**
 * Formata segundos como HH:MM:SS (ou MM:SS) para leitura no relatório/CSV.
 * @param {number} totalSeconds
 * @returns {string}
 */
export const formatWatchedTime = (totalSeconds) => {
  const s = Math.max(0, Math.round(Number(totalSeconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
};

/**
 * Exporta a presença para CSV. Uma linha por aluno; colunas por vídeo (% e
 * segundos), além de vídeos assistidos, presenças e presença %.
 * @param {Array} studentsPresence - saída de computeCoursePresence
 * @param {Array<{id:string, title?:string}>} videos
 * @param {{presencesPerVideo?:number}} opts
 * @returns {string}
 */
export const exportPresenceToCSV = (
  studentsPresence = [],
  videos = [],
  { presencesPerVideo = DEFAULT_PRESENCES_PER_VIDEO } = {}
) => {
  const videoHeaders = [];
  videos.forEach((v) => {
    const title = v.title || "Vídeo";
    videoHeaders.push(`${title} - %`);
    videoHeaders.push(`${title} - Tempo`);
    videoHeaders.push(`${title} - Data`);
  });

  const headers = [
    "Nome",
    "Email",
    ...videoHeaders,
    "Vídeos Assistidos",
    `Presenças (x${presencesPerVideo})`,
    "Presença (%)",
  ];

  const rows = studentsPresence.map((student) => {
    const byId = new Map((student.perVideo || []).map((p) => [p.id, p]));
    const videoCells = [];
    videos.forEach((v) => {
      const p = byId.get(v.id);
      videoCells.push(p ? `${p.percentageWatched}%` : "0%");
      videoCells.push(p ? formatWatchedTime(p.watchedTimeInSeconds) : "0:00");
      // Uma coluna só para a data: o sufixo marca quando ela é aproximada, em
      // vez de gastar uma segunda coluna por vídeo com a procedência.
      const data = p ? formatWatchedDate(p.dataAssistido) : "";
      videoCells.push(
        data && p.origemData === "estimado" ? `${data} (estimado)` : data
      );
    });
    return [
      student.name,
      student.email,
      ...videoCells,
      `${student.watchedCount}/${student.totalVideos}`,
      `${student.presences}/${student.maxPresences}`,
      student.presencePercent.toFixed(2),
    ];
  });

  return [headers, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\n");
};
