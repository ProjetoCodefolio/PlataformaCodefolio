import { database } from "$api/config/firebase";
import { ref, push, set, get, update, query, orderByChild, onValue } from "firebase/database";
import { fetchCourseStudentsEnriched } from "$api/services/courses/students";
import { fetchPrefs, acceptsInApp } from "$api/services/notificationPrefs";

/**
 * Notificações in-app por usuário.
 *
 * Estrutura:
 *   notifications/{userId}/{notificationId}
 *     type, courseId, assignmentId, title, message, link, read, createdAt
 *
 * E-mail: mantido DESLIGADO por padrão. O envio de e-mail atual (reportes) usa
 * um template fixo do EmailJS e não serve para e-mailar alunos. Quando houver
 * um template dedicado, basta implementar o envio dentro do seam abaixo.
 */

// Liga/desliga o envio de e-mail de notificação. Deixe false até existir um
// template dedicado no EmailJS para enunciados.
export const EMAIL_NOTIFICATIONS_ENABLED = false;

/**
 * Cria uma notificação in-app para um usuário.
 */
export const createNotification = async (userId, notification) => {
  if (!userId) return null;
  try {
    const listRef = ref(database, `notifications/${userId}`);
    const newRef = push(listRef);
    await set(newRef, {
      type: notification.type || "info",
      courseId: notification.courseId || "",
      assignmentId: notification.assignmentId || "",
      title: notification.title || "",
      message: notification.message || "",
      link: notification.link || "",
      read: false,
      createdAt: new Date().toISOString(),
    });
    return newRef.key;
  } catch (error) {
    console.error("Erro ao criar notificação:", error);
    return null;
  }
};

/**
 * Escuta em tempo real as notificações de um usuário.
 * @param {string} userId
 * @param {(notifications: Array) => void} callback
 * @returns {() => void} função para cancelar a inscrição
 */
export const listenNotifications = (userId, callback) => {
  if (!userId) return () => {};
  const listRef = query(
    ref(database, `notifications/${userId}`),
    orderByChild("createdAt")
  );
  const unsubscribe = onValue(listRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    const data = snapshot.val();
    const list = Object.keys(data)
      .map((id) => ({ id, ...data[id] }))
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    callback(list);
  });
  return unsubscribe;
};

/**
 * Marca uma notificação como lida.
 */
export const markAsRead = async (userId, notificationId) => {
  if (!userId || !notificationId) return;
  try {
    await update(ref(database, `notifications/${userId}/${notificationId}`), {
      read: true,
    });
  } catch (error) {
    console.error("Erro ao marcar notificação como lida:", error);
  }
};

/**
 * Marca todas as notificações do usuário como lidas.
 */
export const markAllAsRead = async (userId) => {
  if (!userId) return;
  try {
    const snapshot = await get(ref(database, `notifications/${userId}`));
    if (!snapshot.exists()) return;
    const updates = {};
    Object.keys(snapshot.val()).forEach((id) => {
      updates[`notifications/${userId}/${id}/read`] = true;
    });
    await update(ref(database), updates);
  } catch (error) {
    console.error("Erro ao marcar todas como lidas:", error);
  }
};

/**
 * Seam de envio de e-mail. Mantido como no-op enquanto
 * EMAIL_NOTIFICATIONS_ENABLED for false.
 */
const sendNotificationEmail = async () => {
  if (!EMAIL_NOTIFICATIONS_ENABLED) return;
  // TODO: quando houver template dedicado no EmailJS, enviar aqui com to_email
  // dinâmico para cada aluno.
};

/**
 * Notifica todos os alunos matriculados sobre um novo enunciado, respeitando
 * as preferências individuais por curso. Cria notificação in-app e (quando
 * habilitado) dispara e-mail.
 *
 * @param {string} courseId
 * @param {Object} assignment - { id, title }
 * @param {string} [courseTitle]
 */
export const notifyNewAssignment = async (courseId, assignment, courseTitle = "") => {
  if (!courseId || !assignment?.id) return;
  try {
    const students = await fetchCourseStudentsEnriched(courseId);
    await Promise.all(
      students
        .filter((s) => s.role !== "teacher")
        .map(async (student) => {
          const prefs = await fetchPrefs(student.userId, courseId);
          if (!acceptsInApp(prefs, "newAssignment")) return;
          await createNotification(student.userId, {
            type: "new_assignment",
            courseId,
            assignmentId: assignment.id,
            title: "Novo enunciado publicado",
            message: `${courseTitle ? courseTitle + ": " : ""}${assignment.title}`,
            link: `/classes?courseId=${courseId}`,
          });
        })
    );
    await sendNotificationEmail();
  } catch (error) {
    console.error("Erro ao notificar novo enunciado:", error);
  }
};

/**
 * Notifica um aluno de que sua entrega foi avaliada.
 */
export const notifyGrade = async (userId, courseId, assignment, grade) => {
  if (!userId || !courseId) return;
  try {
    const prefs = await fetchPrefs(userId, courseId);
    if (!acceptsInApp(prefs, "grade")) return;
    await createNotification(userId, {
      type: "grade",
      courseId,
      assignmentId: assignment?.id || "",
      title: "Nota lançada",
      message: `Você recebeu nota ${grade} em "${assignment?.title || "trabalho"}".`,
      link: `/minhas-avaliacoes`,
    });
  } catch (error) {
    console.error("Erro ao notificar nota:", error);
  }
};
