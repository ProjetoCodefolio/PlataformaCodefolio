/**
 * Formata um nome com capitalização adequada
 */
export const formatName = (name) => {
    if (!name) return "";
    
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };
  
  /**
   * Formata uma data para exibição amigável
   */
  export const formatDate = (dateString, options = {}) => {
    if (!dateString) return "Data não disponível";
    
    const defaultOptions = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    
    const mergedOptions = { ...defaultOptions, ...options };
    
    try {
      return new Date(dateString).toLocaleDateString('pt-BR', mergedOptions);
    } catch (error) {
      console.error("Erro ao formatar data:", error);
      return dateString;
    }
  };
  
  /**
   * Formata o percentual para exibição
   */
  export const formatPercentage = (value, decimals = 0) => {
    if (value === undefined || value === null) return "0%";
    
    const formattedValue = parseFloat(value).toFixed(decimals);
    return `${formattedValue}%`;
  };
  
  /**
   * Extrai o ID do vídeo do YouTube a partir da URL
   */
  export const extractYouTubeVideoId = (url) => {
    if (!url) return null;
    
    const pattern = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(pattern);
    
    return match ? match[1] : null;
  };
  
  /**
   * Verifica se a URL é uma URL válida do YouTube
   */
  export const isValidYouTubeUrl = (url) => {
    if (!url) return false;
    
    const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})(\&.*)?$/;
    return pattern.test(url);
  };
  
  /**
   * Gera um UUID simples
   */
  export const generateUUID = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };