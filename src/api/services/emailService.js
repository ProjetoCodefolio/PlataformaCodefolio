import emailjs from '@emailjs/browser';

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
