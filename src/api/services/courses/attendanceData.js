// Acesso ao Firebase para o relatório de presença. Lê o universo de vídeos-aula,
// os alunos matriculados e o progresso de cada um, e delega o cálculo para as
// funções puras de `attendance.js`. Também persiste a configuração de presenças
// por vídeo (configurável por curso).

import { database } from "../../config/firebase";
import { ref, get, update } from "firebase/database";
import { fetchCourseContent } from "./contentOrder";
import { DEFAULT_PRESENCES_PER_VIDEO } from "./attendance";

/**
 * Vídeos-aula que contam para presença: itens de categoria "video" que NÃO são
 * entregas de sala invertida (source "flipped"). Slides e entregas ficam de fora.
 * @param {string} courseId
 * @returns {Promise<Array<{id:string, title:string}>>}
 */
export const fetchAttendanceVideos = async (courseId) => {
  const content = await fetchCourseContent(courseId);
  return content
    .filter((item) => item.category === "video" && item.source !== "flipped")
    .map((item) => ({ id: item.id, title: item.title }));
};

/**
 * Configuração de presença do curso.
 * @param {string} courseId
 * @returns {Promise<{presencesPerVideo:number}>}
 */
export const fetchAttendanceSettings = async (courseId) => {
  try {
    if (!courseId) return { presencesPerVideo: DEFAULT_PRESENCES_PER_VIDEO };
    const snapshot = await get(ref(database, `courseAttendanceSettings/${courseId}`));
    const data = snapshot.exists() ? snapshot.val() : {};
    const raw = Number(data?.presencesPerVideo);
    const presencesPerVideo =
      Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_PRESENCES_PER_VIDEO;
    return { presencesPerVideo };
  } catch (error) {
    console.error("Erro ao buscar configuração de presença:", error);
    return { presencesPerVideo: DEFAULT_PRESENCES_PER_VIDEO };
  }
};

/**
 * Salva a configuração de presença do curso.
 * @param {string} courseId
 * @param {{presencesPerVideo:number}} settings
 * @returns {Promise<boolean>}
 */
export const saveAttendanceSettings = async (courseId, { presencesPerVideo }) => {
  if (!courseId) throw new Error("ID do curso é obrigatório");
  const raw = Number(presencesPerVideo);
  if (!Number.isFinite(raw) || raw <= 0) {
    throw new Error("As presenças por vídeo devem ser um número maior que zero");
  }
  await update(ref(database, `courseAttendanceSettings/${courseId}`), {
    presencesPerVideo: raw,
  });
  return true;
};

/**
 * Carrega os dados brutos de presença: vídeos-aula, alunos matriculados e o
 * progresso de cada aluno (id do vídeo → nó de videoProgress). O cálculo em si
 * fica nas funções puras de `attendance.js`.
 * @param {string} courseId
 * @returns {Promise<{videos:Array, students:Array, settings:{presencesPerVideo:number}}>}
 */
export const fetchCoursePresenceData = async (courseId) => {
  if (!courseId) return { videos: [], students: [], settings: { presencesPerVideo: DEFAULT_PRESENCES_PER_VIDEO } };

  const [videos, settings, studentCoursesSnap, usersSnap] = await Promise.all([
    fetchAttendanceVideos(courseId),
    fetchAttendanceSettings(courseId),
    get(ref(database, "studentCourses")),
    get(ref(database, "users")),
  ]);

  const studentCourses = studentCoursesSnap.exists() ? studentCoursesSnap.val() : {};
  const users = usersSnap.exists() ? usersSnap.val() : {};

  // Alunos matriculados neste curso (exclui professores do próprio curso).
  const enrolledIds = Object.keys(studentCourses).filter(
    (uid) => studentCourses[uid] && studentCourses[uid][courseId]
  );

  const students = await Promise.all(
    enrolledIds.map(async (uid) => {
      const userData = users[uid] || {};
      const isTeacher = !!(userData.coursesTeacher && userData.coursesTeacher[courseId] === true);

      const progressSnap = await get(ref(database, `videoProgress/${uid}/${courseId}`));
      const progressById = progressSnap.exists() ? progressSnap.val() : {};

      const name =
        userData.displayName ||
        `${userData.firstName || ""} ${userData.lastName || ""}`.trim() ||
        userData.name ||
        userData.email?.split("@")[0] ||
        `Usuário ${uid.substring(0, 6)}`;

      return {
        userId: uid,
        name,
        email: userData.email || "",
        photoURL: userData.photoURL || "",
        isTeacher,
        progressById,
      };
    })
  );

  // Ordena por nome; professores do curso ficam ao final (informativo).
  students.sort((a, b) => {
    if (a.isTeacher !== b.isTeacher) return a.isTeacher ? 1 : -1;
    return a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" });
  });

  return { videos, students, settings };
};
