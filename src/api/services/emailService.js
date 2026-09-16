import emailjs from '@emailjs/browser';
import { auth } from '$api/config/firebase';

/**
 * Configuração do EmailJS
 * Para configurar:
 * 1. Acesse https://www.emailjs.com/
 * 2. Crie uma conta gratuita
 * 3. Crie um serviço de email (Gmail, Outlook, etc.)
 * 4. Crie um template de email
 * 5. Substitua as constantes abaixo com suas chaves
 */

// Suas chaves do EmailJS (substitua após criar conta)
const EMAILJS_SERVICE_ID = 'service_nez6txl';
const EMAILJS_TEMPLATE_ID = 'template_m2s51wz';
const EMAILJS_PUBLIC_KEY = 'cqn_V5cXWHYGDfUWO';

/**
 * Envia email de notificação de reporte
 * @param {object} reportData - Dados do reporte
 * @returns {Promise<boolean>} - Sucesso do envio
 */
export const sendReportEmail = async (reportData) => {
  try {
    // Se as chaves não foram configuradas, apenas loga e retorna sucesso
    if (
      EMAILJS_SERVICE_ID === 'YOUR_SERVICE_ID' ||
      EMAILJS_TEMPLATE_ID === 'YOUR_TEMPLATE_ID' ||
      EMAILJS_PUBLIC_KEY === 'YOUR_PUBLIC_KEY'
    ) {
      console.warn('⚠️ EmailJS não configurado. Email não será enviado.');
      console.log('📧 Dados do reporte que seriam enviados:', reportData);
      return true; // Retorna sucesso para não bloquear o fluxo
    }

    // Gera um link curto para visualizar a imagem no app (evita 413 por payload grande)
    const computedReportId = `report-${reportData.reportNumber}`;
    
    // Usar localhost em desenvolvimento, produção em deploy
    const isDev = typeof window !== 'undefined' && window.location?.hostname === 'localhost';
    const baseUrl = isDev 
      ? `http://localhost:${window.location?.port || 5173}`
      : 'https://plataformacodefolio.web.app';
    
    // Verificar se tem imagem (pode vir como hasImage ou imageUrl)
    const hasImage = reportData.hasImage || !!reportData.imageUrl;
    
    // URL da página para ver e copiar o link Base64
    const imageViewerUrl = hasImage ? `${baseUrl}/reporte-imagem/${computedReportId}` : '';
    
    console.log('📧 Enviando email com:', { hasImage, imageViewerUrl, reportId: computedReportId, isDev });

    // Prepara os dados do template
    const templateParams = {
      to_email: 'projetocodefolio@gmail.com',
      bcc_email: 'emanuelferreira.aluno@unipampa.edu.br, matheusciocca.aluno@unipampa.edu.br',
      report_number: reportData.reportNumber || 'N/A',
      report_name: reportData.reportName || 'Sem nome',
      report_message: reportData.message || 'Sem descrição',
      report_type: reportData.type || 'geral',

      // Dados do usuário
      user_name: reportData.userName || 'Anônimo',
      user_email: reportData.userEmail || 'Não disponível',
      user_id: reportData.userId || 'N/A',

      // Dados do curso
      course_title: reportData.courseTitle || 'N/A',
      course_id: reportData.courseId || 'N/A',

      // Dados do conteúdo
      content_title: reportData.contentTitle || 'N/A',
      content_url: reportData.contentUrl || 'N/A',

      // Dados técnicos
      user_agent: reportData.userAgent || 'N/A',
      screen_resolution: reportData.screenResolution || 'N/A',

      // Imagem anexada
      has_image: hasImage,
      report_id: computedReportId,
      // URL da página para ver a imagem e copiar o link Base64
      image_viewer_url: imageViewerUrl,
      current_time: reportData.currentTime !== undefined ? reportData.currentTime : 'N/A',
      question_title: reportData.questionTitle || 'N/A',
      question_index: reportData.currentQuestionIndex !== undefined ? reportData.currentQuestionIndex + 1 : 'N/A',

      // Data
      date: new Date().toLocaleString('pt-BR', {
        dateStyle: 'full',
        timeStyle: 'short',
      }),
    };

    // Envia o email
    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams,
      EMAILJS_PUBLIC_KEY
    );

    console.log('✅ Email enviado com sucesso:', response);
    return true;
  } catch (error) {
    console.error('❌ Erro ao enviar email:', error);
    // Não falha o reporte se o email não for enviado
    return false;
  }
};

// URL do Worker que enfileira e-mail de notificação (fila Cloudflare Queues
// + Brevo, ver emailWorker/). Sem isso configurado, notificação por e-mail
// fica desligada — igual ao antigo comportamento sem template do EmailJS.
const EMAIL_WORKER_URL = import.meta.env.VITE_EMAIL_WORKER_URL;

// Lista de e-mails, separados por vírgula, usada em teste local (ver
// VITE_FORCE_EMAIL_NOTIFICATIONS em notifications.js). Quando setada, só
// esses endereços recebem e-mail de notificação de fato — qualquer outro
// destinatário (ex: outros alunos matriculados no curso de teste) é
// silenciosamente ignorado. Vazia/ausente = sem filtro (comportamento normal
// de produção).
const TEST_EMAIL_ALLOWLIST = (import.meta.env.VITE_EMAIL_TEST_ALLOWLIST || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

/**
 * Enfileira o e-mail de uma notificação de quiz ou enunciado (criação ou
 * alteração) para um único destinatário. Quem decide SE deve enviar
 * (EMAIL_NOTIFICATIONS_ENABLED, preferência do aluno) é o chamador, em
 * notifications.js — esta função só sabe enfileirar.
 *
 * O envio de fato acontece no Worker (fila + limite diário do Brevo), não
 * aqui — por isso "enqueue", não "send". Assunto e corpo também são montados
 * lá: daqui saem só os dados, já formatados quando dependem do fuso do
 * usuário (datas), porque quem conhece o fuso é o browser.
 *
 * @param {object} params
 * @param {string} params.to - e-mail do destinatário
 * @param {string} [params.name] - nome do destinatário, para saudação
 * @param {'new_quiz'|'quiz_updated'|'new_assignment'|'assignment_updated'} params.type
 * @param {string} params.courseId
 * @param {string} [params.courseTitle]
 * @param {string} [params.itemTitle] - nome do quiz/trabalho, usado no assunto
 * @param {string} [params.link] - caminho relativo (ex.: "/classes?courseId=x")
 * @param {string[]} [params.changes] - o que mudou, só nas notificações de alteração
 * @param {object} [params.fields] - valores já formatados por campo (ver FIELD_META no Worker)
 * @returns {Promise<boolean>}
 */
export const enqueueNotificationEmail = async ({
  to,
  name,
  type,
  courseId,
  courseTitle,
  itemTitle,
  link,
  changes,
  fields,
}) => {
  if (!to || !type || !EMAIL_WORKER_URL) return false;

  if (
    TEST_EMAIL_ALLOWLIST.length &&
    !TEST_EMAIL_ALLOWLIST.includes(to.toLowerCase())
  ) {
    console.warn(`✋ E-mail de teste bloqueado (fora da allowlist): ${to}`);
    return false;
  }

  try {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) return false;

    const response = await fetch(`${EMAIL_WORKER_URL}/enqueue`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        to,
        name,
        type,
        courseId,
        courseTitle,
        itemTitle,
        link,
        changes,
        fields,
      }),
    });
    return response.ok;
  } catch (error) {
    console.error('❌ Erro ao enfileirar e-mail de notificação:', error);
    return false;
  }
};

/**
 * Quantos e-mails daquele curso ficaram esperando a cota diária do Brevo hoje.
 * Sem isso o professor não tem como saber que a turma ainda não foi avisada —
 * a fila reentrega sozinha, mas só no dia seguinte.
 *
 * @param {string} courseId
 * @returns {Promise<number>} 0 quando não há adiamento (ou não dá pra saber)
 */
export const fetchDeferredEmailCount = async (courseId) => {
  if (!courseId || !EMAIL_WORKER_URL) return 0;

  try {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) return 0;

    const response = await fetch(
      `${EMAIL_WORKER_URL}/quota-status?courseId=${encodeURIComponent(courseId)}`,
      { headers: { authorization: `Bearer ${idToken}` } }
    );
    if (!response.ok) return 0;

    const data = await response.json();
    return Number(data?.deferred) || 0;
  } catch (error) {
    console.error('❌ Erro ao consultar a cota de e-mail:', error);
    return 0;
  }
};

/**
 * Formata o texto do tipo de reporte para português
 * @param {string} type - Tipo do reporte
 * @returns {string} - Tipo formatado
 */
export const formatReportType = (type) => {
  const types = {
    video: 'Vídeo',
    quiz: 'Quiz',
    slide: 'Slide',
    geral: 'Geral',
  };
  return types[type] || type;
};
