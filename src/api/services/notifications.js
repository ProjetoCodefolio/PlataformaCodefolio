import { database } from "$api/config/firebase";
import { ref, push, set, get, update, query, orderByChild, onValue } from "firebase/database";
import { fetchCourseStudentsEnriched } from "$api/services/courses/students";
import { fetchPrefs, acceptsInApp } from "$api/services/notificationPrefs";
import {
  buildContentNotification,
  buildQuizNotification,
} from "../../shared/notificationText.js";
import { enqueueNotificationEmail } from "$api/services/emailService";

/**
 * Notificações in-app por usuário.
 *
 * Estrutura:
 *   notifications/{userId}/{notificationId}
 *     type, courseId, assignmentId, quizId, title, message, link, read, createdAt
 *
 * E-mail: enfileirado no Worker (Cloudflare Queues + Brevo, ver
 * emailWorker/), não enviado direto — ver VITE_EMAIL_WORKER_URL e
 * enqueueNotificationEmail em emailService.js.
 */

// Liga/desliga o envio de e-mail de notificação. `import.meta.env.PROD` só é
// true num `vite build` de verdade (app hospedado) — nunca em `npm run dev`,
// mesmo com VITE_MODE=production no .env (que só controla o emulador do
// banco). De propósito: sem essa separação, testar localmente contra o
// Firebase real já dispararia e-mail de verdade para alunos matriculados de
// verdade.
//
// VITE_FORCE_EMAIL_NOTIFICATIONS=true é a única forma de ligar isso em `npm
// run dev`, pra teste local pontual — deve vir sempre acompanhado de
// VITE_EMAIL_TEST_ALLOWLIST (ver emailService.js), que restringe quem
// realmente recebe o e-mail.
export const EMAIL_NOTIFICATIONS_ENABLED =
  import.meta.env.PROD || import.meta.env.VITE_FORCE_EMAIL_NOTIFICATIONS === "true";

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
      quizId: notification.quizId || "",
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
 * Enfileira o e-mail de UMA notificação para UM destinatário. No-op fora de
 * produção (EMAIL_NOTIFICATIONS_ENABLED) ou sem e-mail do destinatário —
 * quem decide QUEM recebe (preferência por tipo) é o chamador.
 *
 * Só quiz e enunciado mandam e-mail. Vídeo/slide novo e nota lançada ficam
 * apenas no sino: são os dois eventos mais frequentes da plataforma e, com
 * fan-out por aluno, consumiam a cota diária do Brevo (300/dia no plano free)
 * sem serem urgentes — quem entra no curso vê.
 */
const sendNotificationEmail = async (params) => {
  if (!EMAIL_NOTIFICATIONS_ENABLED || !params.to) return;
  try {
    await enqueueNotificationEmail(params);
  } catch (error) {
    console.error("Erro ao enviar e-mail de notificação:", error);
  }
};

/**
 * Campos de um item de avaliação (nome + peso na média do curso).
 */
const assessmentEmailFields = (assessment) => ({
  weight: assessment?.percentage ? `${assessment.percentage}% da nota final` : "",
  assessmentDescription: assessment?.description || "",
});

/**
 * Busca e-mail e nome de um único usuário — para as notificações de
 * destinatário único (nota, mudança de grupo), que não passam por
 * fetchCourseStudentsEnriched (esse já traz email/name prontos por aluno).
 */
const fetchUserEmailAndName = async (userId) => {
  try {
    const snapshot = await get(ref(database, `users/${userId}`));
    const user = snapshot.val();
    return {
      email: user?.email || null,
      name: user?.displayName || user?.firstName || user?.name || "",
    };
  } catch (error) {
    console.error("Erro ao buscar e-mail do usuário:", error);
    return { email: null, name: "" };
  }
};

/**
 * Campos do enunciado que o e-mail mostra, já formatados.
 */
const assignmentEmailFields = (assignment) => ({
  dueDate: assignment?.dueDateText || "",
  weight: assignment?.weight ? `${assignment.weight}% da nota final` : "",
  mode: assignment?.mode === "group" ? "Em grupo" : "Individual",
  descriptionHtml: assignment?.descriptionHtml || "",
});

/**
 * Notifica todos os alunos matriculados sobre um enunciado novo ou alterado,
 * respeitando as preferências individuais por curso.
 *
 * A alteração só chega aqui quando o professor marca "avisar a turma" no
 * formulário: sem isso, corrigir uma vírgula no enunciado mandaria um e-mail
 * para a turma inteira e queimaria a cota diária do dia.
 *
 * @param {string} courseId
 * @param {Object} assignment - { id, title, dueDateText, weight, mode, descriptionHtml }
 * @param {string} [courseTitle]
 * @param {string[]} [changes] - o que mudou; vazio significa enunciado novo
 */
export const notifyNewAssignment = async (
  courseId,
  assignment,
  courseTitle = "",
  changes = []
) => {
  if (!courseId || !assignment?.id) return;
  const isUpdate = changes.length > 0;
  const title = isUpdate ? "Enunciado atualizado" : "Novo enunciado publicado";
  try {
    const students = await fetchCourseStudentsEnriched(courseId);
    const message = `${courseTitle ? courseTitle + ": " : ""}${assignment.title}`;
    const link = `/classes?courseId=${courseId}`;

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
            title,
            message,
            link,
          });
          await sendNotificationEmail({
            to: student.email,
            name: student.name,
            type: isUpdate ? "assignment_updated" : "new_assignment",
            courseId,
            courseTitle,
            itemTitle: assignment.title,
            link,
            changes,
            fields: assignmentEmailFields(assignment),
          });
        })
    );
  } catch (error) {
    console.error("Erro ao notificar enunciado:", error);
  }
};

/**
 * Notifica todos os alunos matriculados sobre um quiz novo ou alterado,
 * respeitando as preferências individuais por curso — mesmo caminho dos
 * enunciados.
 *
 * Na CRIAÇÃO o disparo é automático: com a janela de disponibilidade, criar é
 * o momento do lançamento. Na ALTERAÇÃO só chega aqui se o professor marcar
 * "avisar a turma" no modal de configurações — e o modal manda um aviso só por
 * sessão de edição, não um por campo salvo.
 *
 * @param {string} courseId
 * @param {Object} quiz - { id, title, openDate, closeDate, minPercentage, allowRetry, maxAttempts, isDiagnostic }
 * @param {string} [courseTitle]
 * @param {string[]} [changes] - o que mudou; vazio significa quiz novo
 */
export const notifyNewQuiz = async (
  courseId,
  quiz,
  courseTitle = "",
  changes = []
) => {
  if (!courseId || !quiz?.id) return;
  try {
    const students = await fetchCourseStudentsEnriched(courseId);
    const { email, ...notification } = buildQuizNotification({
      courseId,
      quiz,
      courseTitle,
      changes,
    });

    await Promise.all(
      students
        .filter((s) => s.role !== "teacher")
        .map(async (student) => {
          const prefs = await fetchPrefs(student.userId, courseId);
          if (!acceptsInApp(prefs, "newQuiz")) return;
          await createNotification(student.userId, notification);
          await sendNotificationEmail({
            to: student.email,
            name: student.name,
            courseId,
            courseTitle,
            link: notification.link,
            ...email,
          });
        })
    );
  } catch (error) {
    console.error("Erro ao notificar quiz:", error);
  }
};

/**
 * Notifica a turma sobre um item de avaliação novo ou alterado (o "Prova 1 —
 * 30%" que compõe a média do curso). Mesmo molde de quiz e enunciado: criar
 * sempre avisa, alterar só quando o professor marca.
 *
 * @param {string} courseId
 * @param {Object} assessment - { id, name, percentage, description }
 * @param {string} [courseTitle]
 * @param {string[]} [changes] - o que mudou; vazio significa avaliação nova
 */
export const notifyAssessment = async (
  courseId,
  assessment,
  courseTitle = "",
  changes = []
) => {
  if (!courseId || !assessment?.name) return;
  const isUpdate = changes.length > 0;
  const title = isUpdate ? "Avaliação atualizada" : "Nova avaliação cadastrada";
  try {
    const students = await fetchCourseStudentsEnriched(courseId);
    const message = `${courseTitle ? courseTitle + ": " : ""}${assessment.name}${
      assessment.percentage ? ` (${assessment.percentage}% da nota)` : ""
    }`;
    const link = `/minhas-avaliacoes`;

    await Promise.all(
      students
        .filter((s) => s.role !== "teacher")
        .map(async (student) => {
          const prefs = await fetchPrefs(student.userId, courseId);
          if (!acceptsInApp(prefs, "newAssessment")) return;
          await createNotification(student.userId, {
            type: "new_assessment",
            courseId,
            title,
            message,
            link,
          });
          await sendNotificationEmail({
            to: student.email,
            name: student.name,
            type: isUpdate ? "assessment_updated" : "new_assessment",
            courseId,
            courseTitle,
            itemTitle: assessment.name,
            link,
            changes,
            fields: assessmentEmailFields(assessment),
          });
        })
    );
  } catch (error) {
    console.error("Erro ao notificar avaliação:", error);
  }
};

/**
 * Notifica todos os alunos matriculados sobre um novo vídeo/slide publicado.
 *
 * SÓ IN-APP, de propósito: publicar conteúdo é o evento mais frequente do
 * curso e, com fan-out por aluno, uma semana cadastrada de uma vez consumia a
 * cota diária inteira do Brevo (300/dia no plano free) com aviso que não é
 * urgente — quem entra no curso vê o item novo.
 *
 * @param {string} courseId
 * @param {Object} content - { id, title, category } (category: 'video'|'slide')
 * @param {string} [courseTitle]
 */
export const notifyNewContent = async (courseId, content, courseTitle = "") => {
  if (!courseId || !content?.id) return;
  try {
    const students = await fetchCourseStudentsEnriched(courseId);
    const notification = buildContentNotification({ courseId, content, courseTitle });

    await Promise.all(
      students
        .filter((s) => s.role !== "teacher")
        .map(async (student) => {
          const prefs = await fetchPrefs(student.userId, courseId);
          if (!acceptsInApp(prefs, "newContent")) return;
          await createNotification(student.userId, notification);
        })
    );
  } catch (error) {
    console.error("Erro ao notificar novo conteúdo:", error);
  }
};

/**
 * Avisa o aluno que o PROFESSOR mexeu na composição do grupo dele (moveu ou
 * removeu de um grupo de trabalho). Não cobre entrar/sair pelo GroupPicker —
 * aquelas são ações do próprio aluno, que já sabe que fez.
 *
 * @param {string} userId - aluno afetado
 * @param {string} courseId
 * @param {Object} assignment - { id, title }
 * @param {'moved'|'removed'} action
 */
export const notifyGroupChanges = async (userId, courseId, assignment, action) => {
  if (!userId || !courseId) return;
  try {
    const prefs = await fetchPrefs(userId, courseId);
    if (!acceptsInApp(prefs, "groupChanges")) return;

    const trabalho = assignment?.title || "um trabalho";
    const title = "Mudança no seu grupo";
    const message =
      action === "removed"
        ? `Você foi removido do grupo em "${trabalho}".`
        : `Você foi movido de grupo em "${trabalho}".`;
    const link = `/minhas-avaliacoes`;

    await createNotification(userId, {
      type: "group_changes",
      courseId,
      assignmentId: assignment?.id || "",
      title,
      message,
      link,
    });

    // Continua mandando e-mail (diferente de conteúdo/nota): é destinatário
    // único, então não pesa na cota diária, e o aluno precisa saber que foi
    // mexido de grupo antes de aparecer na aula achando que está no time errado.
    const { email, name } = await fetchUserEmailAndName(userId);
    await sendNotificationEmail({
      to: email,
      name,
      type: "group_changes",
      courseId,
      itemTitle: trabalho,
      link,
      fields: {
        action:
          action === "removed"
            ? "Você foi removido do grupo"
            : "Você foi movido de grupo",
        assignmentTitle: trabalho,
      },
    });
  } catch (error) {
    console.error("Erro ao notificar mudança de grupo:", error);
  }
};

/**
 * Notifica um aluno de que sua entrega foi avaliada.
 *
 * SÓ IN-APP, de propósito: numa turma inteira avaliada de uma vez o fan-out é
 * igual ao de um anúncio para todos, e a nota é algo que o aluno confere em
 * "Minhas avaliações" quando quer — não precisa chegar por e-mail.
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

/**
 * Avisa o DONO do curso que um aluno registrou uma nova dúvida.
 *
 * É a única notificação que sai de um aluno para o professor — as demais vão no
 * sentido contrário. A regra de `notifications` no banco foi ampliada para
 * aceitar isso: qualquer autenticado pode CRIAR uma notificação na caixa de
 * quem é dono do curso citado (e nada além disso).
 *
 * A dúvida em si é anônima na apresentação; a notificação segue a mesma linha e
 * não cita o autor — quem precisa saber quem perguntou vê na aba "Dúvidas".
 *
 * @param {string} courseId
 * @param {Object} question - { contentTitle, text }
 * @param {string} [courseTitle]
 */
export const notifyNewCourseQuestion = async (courseId, question, courseTitle = "") => {
  if (!courseId || !question) return;
  try {
    const ownerSnapshot = await get(ref(database, `courses/${courseId}/userId`));
    const ownerId = ownerSnapshot.val();
    if (!ownerId) return;

    const prefs = await fetchPrefs(ownerId, courseId);
    if (!acceptsInApp(prefs, "newQuestion")) return;

    const trecho = String(question.text || "").trim();
    const resumo = trecho.length > 120 ? `${trecho.slice(0, 120)}…` : trecho;

    await createNotification(ownerId, {
      type: "new_question",
      courseId,
      title: "Nova dúvida de aluno",
      message: `${courseTitle ? courseTitle + " • " : ""}${
        question.contentTitle || "Conteúdo"
      }: ${resumo}`,
      link: `/adm-cursos?courseId=${courseId}&tab=6`,
    });
  } catch (error) {
    console.error("Erro ao notificar nova dúvida:", error);
  }
};
