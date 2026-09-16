/**
 * Tipos de erro para diagnóstico detalhado
 */
export const ErrorTypes = {
  API_KEY_INVALID: 'API_KEY_INVALID',
  API_KEY_MISSING: 'API_KEY_MISSING',
  RATE_LIMIT: 'RATE_LIMIT',
  SERVER_ERROR: 'SERVER_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  PDF_EMPTY: 'PDF_EMPTY',
  PDF_PROTECTED: 'PDF_PROTECTED',
  PDF_CORRUPT: 'PDF_CORRUPT',
  JSON_PARSE_ERROR: 'JSON_PARSE_ERROR',
  INVALID_RESPONSE_FORMAT: 'INVALID_RESPONSE_FORMAT',
  NO_VALID_QUESTIONS: 'NO_VALID_QUESTIONS',
  CONTEXT_TOO_LARGE: 'CONTEXT_TOO_LARGE',
  MODEL_NOT_FOUND: 'MODEL_NOT_FOUND',
  UNKNOWN: 'UNKNOWN'
};

/**
 * Cria um erro estruturado com tipo e detalhes
 * @param {string} type - Tipo do erro (de ErrorTypes)
 * @param {string} message - Mensagem para o usuário
 * @param {Object} details - Detalhes técnicos adicionais
 * @returns {Error} - Erro com propriedades adicionais
 */
export const createDetailedError = (type, message, details = {}) => {
  const error = new Error(message);
  error.errorType = type;
  error.details = details;
  error.timestamp = new Date().toISOString();
  return error;
};

/**
 * Função para formatar mensagens de erro amigáveis com detalhes específicos
 * @param {Error} error - Erro ocorrido
 * @returns {string} - Mensagem de erro formatada com sugestões
 */
export const formatFriendlyError = (error) => {
  // Se for um erro estruturado com tipo, usar mensagem formatada específica
  if (error && error.errorType) {
    const details = error.details || {};

    switch (error.errorType) {
      case ErrorTypes.API_KEY_INVALID:
        return `Chave API inválida ou expirada. Verifique suas configurações de API e tente novamente.`;

      case ErrorTypes.API_KEY_MISSING:
        return `Nenhuma chave API configurada. Adicione sua chave API GROQ nas configurações.`;

      case ErrorTypes.RATE_LIMIT:
        return `Limite de requisições atingido. Aguarde ${details.waitTime || 'alguns minutos'} e tente novamente.`;

      case ErrorTypes.SERVER_ERROR:
        return `Serviço temporariamente indisponível (erro ${details.statusCode || 'do servidor'}). Tente novamente em alguns minutos.`;

      case ErrorTypes.NETWORK_ERROR:
        return `Erro de conexão. Verifique sua internet e tente novamente.`;

      case ErrorTypes.PDF_EMPTY:
        return `O PDF não contém texto extraível.\n\nPossíveis causas:\n• O arquivo contém apenas imagens (sem OCR)\n• O PDF está vazio\n• O texto está em formato de imagem\n\nSugestão: Use um PDF com texto selecionável.`;

      case ErrorTypes.PDF_PROTECTED:
        return `O PDF está protegido contra leitura. Remova a proteção ou use outro arquivo.`;

      case ErrorTypes.PDF_CORRUPT:
        return `O arquivo PDF parece estar corrompido ou em formato inválido. Tente outro arquivo.`;

      case ErrorTypes.JSON_PARSE_ERROR:
        return `A IA retornou uma resposta em formato incorreto.\n\nDetalhes: ${details.parseError || 'Formato JSON inválido'}\n\nSugestões:\n• Tente novamente (às vezes a IA falha)\n• Reduza o número de questões\n• Experimente outro modelo de IA`;

      case ErrorTypes.INVALID_RESPONSE_FORMAT:
        return `A resposta da IA não está no formato esperado.\n\nProblema: ${details.issue || 'Estrutura de dados incorreta'}\n\nSugestões:\n• Reduza o número de questões para 5-10\n• Tente o modelo "${details.suggestedModel || 'Llama 4 Maverick'}"\n• Verifique se o PDF tem conteúdo suficiente`;

      case ErrorTypes.NO_VALID_QUESTIONS:
        return `Não foi possível gerar questões válidas.\n\nPossíveis causas:\n• O conteúdo do PDF é muito curto ou genérico\n• O texto não contém informações suficientes para criar questões\n\nSugestões:\n• Use um PDF com mais conteúdo educacional\n• Reduza o número de questões solicitadas`;

      case ErrorTypes.CONTEXT_TOO_LARGE:
        return `O PDF é muito grande para o modelo selecionado.\n\nTamanho: ${details.textLength || '?'} caracteres\nLimite: ${details.maxLength || '?'} caracteres\n\nSugestões:\n• Use um modelo com contexto maior (ex: Llama 3.3 70B)\n• Divida o PDF em partes menores\n• Reduza o número de questões`;

      case ErrorTypes.MODEL_NOT_FOUND:
        return `O modelo de IA selecionado não está disponível.\n\nModelo: ${details.modelId || 'desconhecido'}\n\nPossíveis causas:\n• O modelo foi descontinuado pela API\n• Você não tem acesso a este modelo\n• O nome do modelo está incorreto\n\nSugestão: Selecione outro modelo disponível (recomendamos "Llama 3.3 70B Versatile")`;

      default:
        return error.message || 'Erro desconhecido. Tente novamente.';
    }
  }

  // Fallback para erros não estruturados
  const errorMsg = (error && (error.message || String(error))) || "Erro desconhecido";

  // Detectar tipo de erro pela mensagem
  if (errorMsg.includes("401") || errorMsg.toLowerCase().includes("chave api") || errorMsg.toLowerCase().includes("invalid api")) {
    return `Erro de autenticação: A chave API é inválida ou expirou.\n\nSugestão: Verifique sua chave API nas configurações.`;
  }

  if (errorMsg.includes("404") || errorMsg.toLowerCase().includes("model") && errorMsg.toLowerCase().includes("not found")) {
    // Tentar extrair o nome do modelo
    let modelName = 'selecionado';
    const modelMatch = errorMsg.match(/[`']([^`']+)[`']/);
    if (modelMatch) modelName = `"${modelMatch[1]}"`;

    return `Modelo ${modelName} não está disponível na API.\n\nPossíveis causas:\n• O modelo foi descontinuado\n• Você não tem acesso a este modelo\n\nSugestão: Selecione outro modelo (recomendamos "Llama 3.3 70B Versatile")`;
  }

  if (errorMsg.includes("429")) {
    return `Limite de requisições excedido.\n\nSugestão: Aguarde alguns minutos antes de tentar novamente.`;
  }

  if (errorMsg.includes("500") || errorMsg.includes("502") || errorMsg.includes("503")) {
    return `O serviço de IA está temporariamente indisponível.\n\nSugestão: Tente novamente em alguns minutos.`;
  }

  if (errorMsg.toLowerCase().includes("json") || errorMsg.toLowerCase().includes("parse")) {
    return `A IA retornou uma resposta em formato incorreto.\n\nSugestões:\n• Tente gerar novamente\n• Reduza o número de questões\n• Experimente outro modelo`;
  }

  if (errorMsg.toLowerCase().includes("texto") || errorMsg.toLowerCase().includes("extrair") || errorMsg.toLowerCase().includes("empty")) {
    return `Não foi possível extrair texto do PDF.\n\nPossíveis causas:\n• O PDF contém apenas imagens\n• O arquivo está protegido\n• O PDF está vazio\n\nSugestão: Use um PDF com texto selecionável.`;
  }

  if (errorMsg.includes("NetworkError") || errorMsg.includes("Failed to fetch") || errorMsg.includes("fetch")) {
    return `Erro de conexão com o serviço.\n\nSugestões:\n• Verifique sua conexão com a internet\n• Tente novamente em alguns segundos`;
  }

  if (errorMsg.includes("400")) {
    return `Requisição inválida para o serviço de IA.\n\nSugestões:\n• Reduza o tamanho do PDF\n• Diminua o número de questões\n• Tente outro modelo`;
  }

  // Mensagem genérica com mais contexto
  return `Ocorreu um erro inesperado.\n\nDetalhes técnicos: ${errorMsg.substring(0, 150)}${errorMsg.length > 150 ? '...' : ''}\n\nSugestões:\n• Tente novamente\n• Se o erro persistir, experimente outro modelo\n• Entre em contato com o suporte se necessário`;
};
