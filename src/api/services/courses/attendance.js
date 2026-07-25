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
    return {
      id: v.id,
      title: v.title || "Vídeo sem título",
      percentageWatched,
      watchedTimeInSeconds,
      watched: isVideoWatched(node, threshold),
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
