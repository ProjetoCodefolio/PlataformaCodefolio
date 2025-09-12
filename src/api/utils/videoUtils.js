/**
 * Formata o tempo de segundos para o formato HH:MM:SS ou MM:SS
 * @param {number} seconds - Tempo em segundos
 * @returns {string} - Tempo formatado
 */
export const formatTime = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  return [h, m, s]
    .map((v) => (v < 10 ? "0" + v : v))
    .filter((v, i) => v !== "00" || i > 0)
    .join(":");
};

/**
 * Verifica se um vídeo está bloqueado baseado nas configurações avançadas
 * @param {Object} video - O vídeo a ser verificado
 * @param {Array} videos - Lista de todos os vídeos do curso
 * @param {Object} advancedSettings - Configurações avançadas do curso
 * @returns {boolean} - True se o vídeo estiver bloqueado
 */
export const isVideoLocked = (video, videos, advancedSettings = null) => {
  // Log para debug

  // Se for slide, nunca está bloqueado
  if (video?.isSlide) return false;

  // Se não temos vídeo ou lista de vídeos, não bloqueamos
  if (!video || !videos || !Array.isArray(videos)) return false;

  // Se for o primeiro vídeo, nunca está bloqueado
  const videoIndex = videos.findIndex((v) => v.id === video.id);
  if (videoIndex === 0) return false;

  // VERIFICAÇÃO PRINCIPAL: Se a configuração avançada diz para não exigir conclusão prévia, não bloqueamos
  if (advancedSettings?.videos?.requirePreviousCompletion === false) {
    return false;
  }

  // Lógica padrão de bloqueio
  const previousVideo = videoIndex > 0 ? videos[videoIndex - 1] : null;

  const isBlocked =
    video.requiresPrevious &&
    previousVideo &&
    (!previousVideo.watched ||
      (previousVideo.quizId && !previousVideo.quizPassed));
  
  return isBlocked;
};

/**
 * Determina se o vídeo está próximo do final
 * @param {number} currentTime - Tempo atual do vídeo
 * @param {number} duration - Duração total do vídeo
 * @returns {boolean} - True se estiver próximo do final
 */
export const isNearEnd = (currentTime, duration) => {
  return duration - currentTime <= 2 || currentTime / duration >= 0.995;
};

/**
 * Calcula o progresso do vídeo em porcentagem
 * @param {Object} video - Objeto de vídeo com informações de progresso
 * @returns {number} - Porcentagem de progresso (0-100)
 */
export const calculateProgress = (video) => {
  if (!video) return 0;

  // Se o vídeo estiver marcado como assistido, retornar 100%
  if (video.watched) return 100;

  // Se houver progresso específico definido
  if (video.progress && typeof video.progress === "number") {
    return Math.min(100, Math.max(0, video.progress));
  }

  // Se houver currentTime e duration
  if (video.currentTime && video.duration) {
    const percentage = (video.currentTime / video.duration) * 100;
    return Math.min(100, Math.max(0, percentage));
  }

  return 0;
};
