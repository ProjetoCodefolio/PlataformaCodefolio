import * as pdfjs from "pdfjs-dist";
import { v4 as uuidv4 } from "uuid";
import {
  generateQuestionsWithQuestionApi,
  isQuestionApiEnabled,
  shouldFallbackToGroq,
} from "./questionApiClient";

/**
 * Identificadores dos providers de geração de questões.
 */
export const QUESTION_PROVIDERS = {
  QUESTION_API: "question_api",
  GROQ: "groq",
};

// Modelos GROQ disponíveis (lista atualizada com modelos reais da API GROQ)
export const GROQ_MODELS = [
  // Meta LLaMA - Modelos principais recomendados
  {
    id: "llama-3.3-70b-versatile",
    name: "Llama 3.3 70B Versatile (Recomendado)",
    maxContext: 32768,
  },
  {
    id: "llama-3.1-70b-versatile",
    name: "Llama 3.1 70B Versatile",
    maxContext: 32768,
  },
  {
    id: "llama-3.1-8b-instant",
    name: "Llama 3.1 8B Instant (Rápido)",
    maxContext: 8192,
  },
  {
    id: "llama3-70b-8192",
    name: "Llama 3 70B",
    maxContext: 8192,
  },
  {
    id: "llama3-8b-8192",
    name: "Llama 3 8B",
    maxContext: 8192,
  },

  // Mixtral - Bom para contextos grandes
  {
    id: "mixtral-8x7b-32768",
    name: "Mixtral 8x7B (Contexto Grande)",
    maxContext: 32768,
  },

  // Google Gemma
  {
    id: "gemma2-9b-it",
    name: "Gemma 2 9B",
    maxContext: 8192,
  },
  {
    id: "gemma-7b-it",
    name: "Gemma 7B",
    maxContext: 8192,
  },

  // DeepSeek
  {
    id: "deepseek-r1-distill-llama-70b",
    name: "DeepSeek R1 Distill Llama 70B",
    maxContext: 32768,
  },
];

/**
 * Tipo de questão: 'multiple' para múltipla escolha, 'open' para questões abertas
 */
export const QUESTION_TYPES = {
  MULTIPLE_CHOICE: 'multiple',
  OPEN: 'open'
};

// Prompt para questões de múltipla escolha
export const createMultipleChoicePrompt = (numQuestions) => `
Você é um professor especializado em criar avaliações educacionais de alta qualidade.

Com base exclusivamente no texto a seguir, crie ${numQuestions} questões de múltipla escolha que avaliem a compreensão dos conceitos principais e informações específicas contidas no texto.

Diretrizes para as questões:
1. Foque exclusivamente no conteúdo fornecido, sem introduzir informações externas.
2. Crie perguntas que testem diferentes níveis de compreensão (fatos específicos, conceitos-chave, relações entre ideias).
3. As perguntas devem ser claras, objetivas e diretamente relacionadas a partes importantes do texto.
4. Evite questões sobre detalhes irrelevantes ou triviais.

Diretrizes para as alternativas:
1. Inclua 4 alternativas para cada questão (A, B, C, D).
2. Apenas uma alternativa deve estar correta.
3. As alternativas incorretas devem ser plausíveis, mas claramente incorretas para quem leu o texto atentamente.
4. Varie aleatoriamente a posição da resposta correta entre as alternativas.
5. As alternativas devem ter comprimento e estilo semelhantes entre si.
`;

// Prompt para questões abertas
export const createOpenQuestionPrompt = (numQuestions) => `
Você é um professor especializado em criar avaliações educacionais de alta qualidade.

Com base exclusivamente no texto a seguir, crie ${numQuestions} questões discursivas (abertas) que avaliem a compreensão profunda dos conceitos principais e a capacidade de análise.

Diretrizes para as questões:
1. Foque exclusivamente no conteúdo fornecido, sem introduzir informações externas.
2. Crie perguntas que testem diferentes níveis de compreensão (compreensão básica, análise, síntese, avaliação).
3. As perguntas devem ser claras, desafiadoras e exigir resposta detalhada.
4. Evite questões com respostas muito simples (sim/não).
5. Procure por questões que permitam diferentes perspectivas de resposta, desde que fundamentadas no texto.

Diretrizes para as respostas esperadas:
1. Forneça um gabarito/resposta esperada que mostre os pontos principais que devem ser cobertos.
2. A resposta esperada deve ter entre 3-5 linhas, cobrindo os conceitos-chave.
3. Aceite respostas paráfrases do gabarito desde que cubram os pontos essenciais.
`;

// Parte fixa do prompt para questões de múltipla escolha
export const JSON_FORMAT_INSTRUCTION = `
IMPORTANTE: É necessário gerar EXATAMENTE o número de questões solicitado, nem mais nem menos.

A saída DEVE ser um array JSON com esta estrutura:
[
  {
    "question": "Pergunta baseada no texto?",
    "options": ["Alternativa A", "Alternativa B", "Alternativa C", "Alternativa D"],
    "correctOption": 0
  }
]

Qualquer outro formato não será processado corretamente.
`;

// Parte fixa do prompt para questões abertas
export const JSON_FORMAT_INSTRUCTION_OPEN = `
IMPORTANTE: É necessário gerar EXATAMENTE o número de questões solicitado, nem mais nem menos.

A saída DEVE ser um array JSON com esta estrutura:
[
  {
    "question": "Pergunta discursiva baseada no texto?",
    "expectedAnswer": "Resposta esperada/gabarito com os pontos-chave que devem ser cobertos"
  }
]

Qualquer outro formato não será processado corretamente.
`;

/**
 * Cria o prompt padrão baseado no tipo de questão
 * @param {number} numQuestions - Número de questões
 * @param {string} questionType - Tipo de questão ('multiple' ou 'open')
 * @returns {string} - Prompt para o tipo de questão
 */
export const createDefaultPrompt = (numQuestions, questionType = QUESTION_TYPES.MULTIPLE_CHOICE) => {
  if (questionType === QUESTION_TYPES.OPEN) {
    return createOpenQuestionPrompt(numQuestions);
  }
  return createMultipleChoicePrompt(numQuestions);
};

/**
 * Pré-processa o texto extraído do PDF para melhorar a qualidade da entrada para o LLM
 * @param {string} rawText - Texto bruto extraído do PDF
 * @returns {{text: string, stats: Object}} - Texto processado e estatísticas
 */
export const preprocessPdfText = (rawText) => {
  if (!rawText || typeof rawText !== 'string') {
    return { text: '', stats: { original: 0, processed: 0, reduction: 0 } };
  }

  const originalLength = rawText.length;
  let text = rawText;

  // 1. Normalizar quebras de linha (converter \r\n para \n)
  text = text.replace(/\r\n/g, '\n');

  // 2. Remover múltiplas quebras de linha consecutivas (mais de 2)
  text = text.replace(/(\n\s*){3,}/g, '\n\n');

  // 3. Remover espaços múltiplos (manter apenas um)
  text = text.replace(/[^\S\n]{2,}/g, ' ');

  // 4. Remover padrões comuns de headers/footers de PDF
  // Número de página isolado
  text = text.replace(/^\s*\d+\s*$/gm, '');
  // Padrões como "Página X de Y", "Page X"
  text = text.replace(/\b(p[aá]gina|page)\s*\d+\s*(de|of)?\s*\d*\b/gi, '');
  // Data/hora no formato comum
  text = text.replace(/\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\s*\d{1,2}:\d{2}/g, '');

  // 5. Remover caracteres de controle e não-imprimíveis (exceto espaço e nova linha).
  // Os caracteres de controle são justamente o alvo aqui.
  // eslint-disable-next-line no-control-regex
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // 6. Normalizar caracteres especiais problemáticos
  text = text.replace(/[""]/g, '"');
  text = text.replace(/['']/g, "'");
  text = text.replace(/[–—]/g, '-');
  text = text.replace(/…/g, '...');

  // 7. Remover linhas que contêm apenas pontuação ou símbolos
  text = text.replace(/^[\s\-_=*#.]+$/gm, '');

  // 8. Limpar espaços no início e fim de cada linha
  text = text.split('\n').map(line => line.trim()).join('\n');

  // 9. Remover linhas vazias consecutivas novamente após processamento
  text = text.replace(/(\n\s*){2,}/g, '\n\n');

  // 10. Trim final
  text = text.trim();

  const processedLength = text.length;
  const reduction = originalLength > 0 
    ? Math.round((1 - processedLength / originalLength) * 100) 
    : 0;

  return {
    text,
    stats: {
      original: originalLength,
      processed: processedLength,
      reduction
    }
  };
};

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
 * Cria o prompt completo para a API baseado no tipo de questão
 * @param {string} pdfText - Texto extraído do PDF
 * @param {number} numQuestions - Número de questões a serem geradas
 * @param {string} customPrompt - Prompt personalizado (opcional)
 * @param {string} questionType - Tipo de questão ('multiple' ou 'open')
 * @returns {string} - Prompt completo
 */
export const createPrompt = (pdfText, numQuestions, customPrompt, questionType = QUESTION_TYPES.MULTIPLE_CHOICE) => {
  // Se tivermos um prompt personalizado, use-o, caso contrário use o padrão
  const promptTemplate = customPrompt || createDefaultPrompt(numQuestions, questionType);
  
  // Escolher a instrução de formato correto baseado no tipo
  const formatInstruction = questionType === QUESTION_TYPES.OPEN 
    ? JSON_FORMAT_INSTRUCTION_OPEN 
    : JSON_FORMAT_INSTRUCTION;

  // Adiciona as instruções fixas de formato JSON antes do texto do PDF
  return (
    promptTemplate +
    "\n\n" +
    formatInstruction +
    "\n\nO texto para análise é:\n\n" +
    pdfText
  );
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

/**
 * Extrai texto de imagens do PDF usando OCR (Tesseract.js)
 * @param {File} file - Arquivo PDF
 * @param {Function} onProgress - Callback para atualizar progresso
 * @param {string} selectedModel - ID do modelo selecionado
 * @param {Function} onProcessingStep - Callback para atualizar etapa de processamento
 * @returns {Promise<{text: string, stats: Object, usedOcr: boolean}>}
 */
const extractTextFromPdfWithOcr = async (file, onProgress, selectedModel, onProcessingStep) => {
  try {
    if (onProcessingStep) {
      onProcessingStep('Extraindo texto usando OCR (reconhecimento óptico)...');
    }

    // Importação dinâmica do Tesseract
    const { createWorker } = await import('tesseract.js');
    
    pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;

    console.debug(`extractTextFromPdfWithOcr - Processando ${numPages} páginas com OCR`);

    let fullText = "";
    const pageTexts = [];

    // Criar worker do Tesseract
    const worker = await createWorker('por', 1, {
      logger: (m) => {
        if (m.status === 'loading tesseract core' && onProgress) {
          onProgress(5);
        }
      }
    });

    for (let i = 1; i <= numPages; i++) {
      try {
        const page = await pdf.getPage(i);
        
        // Renderizar página como imagem com escala maior para melhor OCR
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;

        if (onProgress) {
          // 5-40% para renderização e OCR
          onProgress(5 + Math.round((i / numPages) * 35));
        }

        // Executar OCR na imagem do canvas
        const { data: { text } } = await worker.recognize(canvas);

        pageTexts.push({
          pageNum: i,
          text: text,
          charCount: text.length
        });

        fullText += text + "\n\n";
        
        console.debug(`extractTextFromPdfWithOcr - Página ${i}/${numPages}: ${text.length} caracteres extraídos`);
      } catch (pageError) {
        console.warn(`extractTextFromPdfWithOcr - Erro na página ${i}:`, pageError.message);
      }
    }

    // Encerrar worker
    await worker.terminate();

    if (onProgress) {
      onProgress(45);
    }

    // Aplicar pré-processamento
    const { text: processedText, stats: preprocessStats } = preprocessPdfText(fullText);

    if (onProgress) {
      onProgress(50);
    }

    // Ajustar o tamanho máximo com base no modelo selecionado
    const selectedModelInfo = GROQ_MODELS.find((m) => m.id === selectedModel);
    const maxContextSize = selectedModelInfo ? selectedModelInfo.maxContext : 8192;
    const maxLength = Math.floor(maxContextSize * 0.5 * 4);

    let finalText = processedText;
    let wasTruncated = false;

    if (processedText.length > maxLength) {
      finalText = processedText.substring(0, maxLength);
      const lastParagraph = finalText.lastIndexOf('\n\n');
      if (lastParagraph > maxLength * 0.8) {
        finalText = finalText.substring(0, lastParagraph);
      }
      finalText += '\n\n[Texto truncado devido ao tamanho. Partes finais do documento não foram incluídas.]';
      wasTruncated = true;
    }

    return {
      text: finalText,
      stats: {
        ...preprocessStats,
        numPages,
        usedOcr: true,
        wasTruncated,
        finalLength: finalText.length,
        maxAllowed: maxLength,
        pageStats: pageTexts.map(p => ({ page: p.pageNum, chars: p.charCount }))
      }
    };
  } catch (error) {
    console.error("Erro ao extrair texto com OCR:", error);
    throw createDetailedError(
      ErrorTypes.PDF_CORRUPT,
      'Não foi possível extrair texto do PDF usando OCR.',
      { originalError: error.message }
    );
  }
};

/**
 * Extrai texto de um arquivo PDF com pré-processamento e OCR fallback
 * @param {File} file - Arquivo PDF
 * @param {Function} onProgress - Callback para atualizar progresso (0-100)
 * @param {string} selectedModel - ID do modelo selecionado
 * @param {Function} onProcessingStep - Callback para atualizar etapa de processamento
 * @returns {Promise<{text: string, stats: Object}>} - Texto extraído e estatísticas
 */
export const extractTextFromPdf = async (file, onProgress, selectedModel, onProcessingStep) => {
  try {
    // Defina o worker para o pdfjs
    pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

    let arrayBuffer;
    try {
      arrayBuffer = await file.arrayBuffer();
    } catch (bufferError) {
      throw createDetailedError(
        ErrorTypes.PDF_CORRUPT,
        'Não foi possível ler o arquivo PDF.',
        { originalError: bufferError.message }
      );
    }

    let pdf;
    try {
      pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    } catch (pdfError) {
      // Detectar se é erro de proteção
      if (pdfError.message && pdfError.message.includes('password')) {
        throw createDetailedError(
          ErrorTypes.PDF_PROTECTED,
          'O PDF está protegido por senha.',
          { originalError: pdfError.message }
        );
      }
      throw createDetailedError(
        ErrorTypes.PDF_CORRUPT,
        'Não foi possível processar o PDF. O arquivo pode estar corrompido.',
        { originalError: pdfError.message }
      );
    }

    const numPages = pdf.numPages;
    let rawText = "";
    const pageTexts = [];

    console.debug(`extractTextFromPdf - Processando ${numPages} páginas do PDF`);

    for (let i = 1; i <= numPages; i++) {
      if (onProgress) {
        onProgress(Math.round((i / numPages) * 40)); // 0-40% para extração
      }
      
      try {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        
        // Extrair texto com melhor preservação de estrutura
        let pageText = '';
        let lastY = null;
        
        for (const item of content.items) {
          // Detectar quebra de linha por mudança de posição Y
          if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
            pageText += '\n';
          }
          pageText += item.str;
          // Adicionar espaço se não terminar com espaço
          if (item.str && !item.str.endsWith(' ')) {
            pageText += ' ';
          }
          lastY = item.transform[5];
        }
        
        pageTexts.push({
          pageNum: i,
          text: pageText,
          charCount: pageText.length
        });
        
        rawText += pageText + "\n\n";
      } catch (pageError) {
        console.warn(`extractTextFromPdf - Erro na página ${i}:`, pageError.message);
        // Continuar com outras páginas
      }
    }

    if (onProgress) {
      onProgress(45); // 45% após extração
    }

    // Aplicar pré-processamento
    const { text: processedText, stats: preprocessStats } = preprocessPdfText(rawText);

    if (onProgress) {
      onProgress(50); // 50% após pré-processamento
    }

    console.debug('extractTextFromPdf - Estatísticas:', {
      páginas: numPages,
      caracteresOriginais: preprocessStats.original,
      caracteresProcessados: preprocessStats.processed,
      reduçãoPercent: preprocessStats.reduction
    });

    // Verificar se há texto suficiente
    if (!processedText.trim() || processedText.trim().length < 50) {
      console.warn('extractTextFromPdf - Texto insuficiente detectado. Iniciando OCR...');
      
      if (onProgress) {
        onProgress(0); // Reset progresso para OCR
      }

      // Tentar OCR como fallback
      try {
        const ocrResult = await extractTextFromPdfWithOcr(file, onProgress, selectedModel, onProcessingStep);
        
        if (ocrResult.text.trim().length >= 50) {
          console.debug('extractTextFromPdf - OCR bem-sucedido! Texto extraído:', ocrResult.text.length, 'caracteres');
          return ocrResult;
        } else {
          console.warn('extractTextFromPdf - OCR retornou texto insuficiente:', ocrResult.text.length, 'caracteres');
          throw createDetailedError(
            ErrorTypes.PDF_EMPTY,
            'O PDF não contém texto suficiente mesmo após OCR.',
            {
              textLength: ocrResult.text.length,
              numPages,
              message: 'O PDF pode estar completamente vazio ou corrupto'
            }
          );
        }
      } catch (ocrError) {
        console.error('extractTextFromPdf - OCR também falhou:', ocrError);
        
        // Se OCR também falhou, lançar erro informando que ambos falharam
        if (ocrError.errorType) {
          throw ocrError;
        }
        
        throw createDetailedError(
          ErrorTypes.PDF_EMPTY,
          'O PDF não contém texto suficiente. Extração normal e OCR falharam.',
          {
            textLength: processedText.length,
            numPages,
            ocrError: ocrError.message
          }
        );
      }
    }

    // Ajustar o tamanho máximo com base no modelo selecionado
    const selectedModelInfo = GROQ_MODELS.find((m) => m.id === selectedModel);
    const maxContextSize = selectedModelInfo ? selectedModelInfo.maxContext : 8192;

    // Converter para tokens aproximados (1 token ~= 4 caracteres)
    // Mantendo margem para o prompt e resposta (50% do contexto para o texto)
    const maxLength = Math.floor(maxContextSize * 0.5 * 4);

    let finalText = processedText;
    let wasTruncated = false;

    if (processedText.length > maxLength) {
      // Truncar de forma inteligente - tentar manter parágrafos completos
      finalText = processedText.substring(0, maxLength);
      const lastParagraph = finalText.lastIndexOf('\n\n');
      if (lastParagraph > maxLength * 0.8) {
        finalText = finalText.substring(0, lastParagraph);
      }
      finalText += '\n\n[Texto truncado devido ao tamanho. Partes finais do documento não foram incluídas.]';
      wasTruncated = true;
      
      console.warn(`extractTextFromPdf - Texto truncado de ${processedText.length} para ${finalText.length} caracteres`);
    }

    return {
      text: finalText,
      stats: {
        ...preprocessStats,
        numPages,
        wasTruncated,
        finalLength: finalText.length,
        maxAllowed: maxLength,
        usedOcr: false
      }
    };
  } catch (error) {
    // Se já é um erro estruturado, repassar
    if (error.errorType) {
      throw error;
    }
    
    console.error("Erro ao extrair texto do PDF:", error);
    throw createDetailedError(
      ErrorTypes.PDF_CORRUPT,
      'Não foi possível ler o texto do PDF.',
      { originalError: error.message }
    );
  }
};

/**
 * Analisa a resposta da API GROQ para extrair as questões em formato JSON
 * @param {string} responseContent - Conteúdo da resposta da API
 * @returns {Array} - Array de questões analisadas
 */
/**
 * Analisa a resposta da API GROQ para extrair as questões em formato JSON
 * @param {string} responseContent - Conteúdo da resposta da API
 * @param {string} questionType - Tipo de questão ('multiple' ou 'open')
 * @returns {Array} - Array de questões analisadas
 */
export const parseGroqResponse = (responseContent, questionType = QUESTION_TYPES.MULTIPLE_CHOICE) => {
  // Log para diagnóstico
  console.debug('parseGroqResponse - Conteúdo recebido (primeiros 500 chars):', 
    responseContent ? responseContent.substring(0, 500) : 'VAZIO');
  
  if (!responseContent || typeof responseContent !== 'string') {
    throw createDetailedError(
      ErrorTypes.INVALID_RESPONSE_FORMAT,
      'A IA não retornou nenhum conteúdo.',
      { issue: 'Resposta vazia ou nula' }
    );
  }

  let parseError = null;
  let parsedData = null;

  // Tentativa 1: Tentar analisar diretamente como JSON
  try {
    parsedData = JSON.parse(responseContent);
    if (Array.isArray(parsedData)) {
      console.debug('parseGroqResponse - Sucesso na tentativa 1 (JSON direto)');
      return validateParsedQuestions(parsedData, questionType);
    } else if (parsedData && typeof parsedData === 'object') {
      // Alguns modelos retornam { questions: [...] }
      if (Array.isArray(parsedData.questions)) {
        console.debug('parseGroqResponse - Sucesso na tentativa 1 (objeto com .questions)');
        return validateParsedQuestions(parsedData.questions, questionType);
      }
    }
  } catch (e) {
    parseError = e.message;
    console.debug('parseGroqResponse - Tentativa 1 falhou:', e.message);
  }

  // Tentativa 2: Procurar por array JSON na resposta
  try {
    const jsonRegex = /\[\s*\{[\s\S]*?\}\s*\]/g;
    const matches = responseContent.match(jsonRegex);
    if (matches && matches.length > 0) {
      // Tentar cada match até encontrar um válido
      for (const match of matches) {
        try {
          parsedData = JSON.parse(match);
          if (Array.isArray(parsedData) && parsedData.length > 0) {
            console.debug('parseGroqResponse - Sucesso na tentativa 2 (regex array)');
            return validateParsedQuestions(parsedData, questionType);
          }
        } catch (innerE) {
          continue;
        }
      }
    }
  } catch (e) {
    parseError = parseError || e.message;
    console.debug('parseGroqResponse - Tentativa 2 falhou:', e.message);
  }

  // Tentativa 3: Procurar por blocos de código markdown
  try {
    const markdownCodeRegex = /```(?:json)?([\s\S]*?)```/g;
    const codeMatches = [...responseContent.matchAll(markdownCodeRegex)];
    if (codeMatches && codeMatches.length > 0) {
      for (const codeMatch of codeMatches) {
        try {
          const jsonContent = codeMatch[1].trim();
          parsedData = JSON.parse(jsonContent);
          if (Array.isArray(parsedData)) {
            console.debug('parseGroqResponse - Sucesso na tentativa 3 (markdown code block)');
            return validateParsedQuestions(parsedData, questionType);
          }
        } catch (innerE) {
          continue;
        }
      }
    }
  } catch (e) {
    parseError = parseError || e.message;
    console.debug('parseGroqResponse - Tentativa 3 falhou:', e.message);
  }

  // Tentativa 4: Tentar extrair JSON com correção de erros comuns
  try {
    let cleanedContent = responseContent
      // Remover texto antes do primeiro [
      .replace(/^[^[]*/, '')
      // Remover texto após o último ]
      .replace(/\][^\]]*$/, ']')
      // Corrigir vírgulas extras
      .replace(/,\s*]/g, ']')
      .replace(/,\s*}/g, '}')
      // Corrigir aspas simples para duplas
      .replace(/'/g, '"');
    
    parsedData = JSON.parse(cleanedContent);
    if (Array.isArray(parsedData)) {
      console.debug('parseGroqResponse - Sucesso na tentativa 4 (limpeza de JSON)');
      return validateParsedQuestions(parsedData, questionType);
    }
  } catch (e) {
    parseError = parseError || e.message;
    console.debug('parseGroqResponse - Tentativa 4 falhou:', e.message);
  }

  // Tentativa 5: Recuperar questões completas de uma resposta truncada.
  // Quando o array é cortado por max_tokens (falta o "]" final), as tentativas
  // acima falham. Como os objetos de questão não têm chaves {} aninhadas
  // (options usa []), extraímos cada objeto {...} completo individualmente e
  // descartamos apenas o fragmento final incompleto.
  try {
    const objectRegex = /\{[^{}]*\}/g;
    const objectMatches = responseContent.match(objectRegex);
    if (objectMatches && objectMatches.length > 0) {
      const salvaged = [];
      for (const objStr of objectMatches) {
        try {
          salvaged.push(JSON.parse(objStr));
        } catch (innerE) {
          continue;
        }
      }
      if (salvaged.length > 0) {
        console.warn(
          `parseGroqResponse - Resposta truncada: recuperadas ${salvaged.length} questão(ões) completa(s) de ${objectMatches.length} bloco(s).`
        );
        return validateParsedQuestions(salvaged, questionType);
      }
    }
  } catch (e) {
    parseError = parseError || e.message;
    console.debug('parseGroqResponse - Tentativa 5 falhou:', e.message);
  }

  // Se chegou aqui, não conseguimos extrair o JSON
  // Criar erro detalhado com diagnóstico
  const contentPreview = responseContent.substring(0, 200);
  const hasJsonStart = responseContent.includes('[') || responseContent.includes('{');
  const hasJsonEnd = responseContent.includes(']') || responseContent.includes('}');
  
  let diagnosticMessage = '';
  if (!hasJsonStart && !hasJsonEnd) {
    diagnosticMessage = 'A resposta não contém estrutura JSON. O modelo pode ter retornado texto puro.';
  } else if (!hasJsonStart) {
    diagnosticMessage = 'A resposta não começa com um array JSON válido.';
  } else if (!hasJsonEnd) {
    diagnosticMessage = 'A resposta JSON parece estar truncada (incompleta).';
  } else {
    diagnosticMessage = `Erro ao interpretar JSON: ${parseError || 'formato inválido'}`;
  }

  console.error('parseGroqResponse - Todas as tentativas falharam. Preview:', contentPreview);
  
  throw createDetailedError(
    ErrorTypes.JSON_PARSE_ERROR,
    'Não foi possível interpretar a resposta da IA.',
    {
      parseError: diagnosticMessage,
      contentPreview,
      hasJsonStart,
      hasJsonEnd,
      contentLength: responseContent.length
    }
  );
};

/**
 * Valida e filtra questões parseadas, retornando erro detalhado se inválidas
 * @param {Array} questions - Array de questões parseadas
 * @returns {Array} - Array de questões validadas
 */
/**
 * Valida e filtra questões parseadas, retornando erro detalhado se inválidas
 * @param {Array} questions - Array de questões parseadas
 * @param {string} questionType - Tipo de questão ('multiple' ou 'open')
 * @returns {Array} - Array de questões validadas
 */
const validateParsedQuestions = (questions, questionType = QUESTION_TYPES.MULTIPLE_CHOICE) => {
  if (!Array.isArray(questions) || questions.length === 0) {
    throw createDetailedError(
      ErrorTypes.NO_VALID_QUESTIONS,
      'Nenhuma questão encontrada na resposta.',
      { issue: 'Array vazio ou inválido' }
    );
  }

  const validQuestions = [];
  const invalidReasons = [];

  if (questionType === QUESTION_TYPES.OPEN) {
    // Validação para questões abertas
    questions.forEach((q, index) => {
      const issues = [];
      
      if (!q || typeof q !== 'object') {
        issues.push('não é um objeto');
      } else {
        if (!q.question || typeof q.question !== 'string') {
          issues.push('campo "question" ausente ou inválido');
        }
        if (!q.expectedAnswer || typeof q.expectedAnswer !== 'string') {
          issues.push('campo "expectedAnswer" ausente ou inválido');
        }
      }

      if (issues.length === 0) {
        validQuestions.push(q);
      } else {
        invalidReasons.push(`Questão ${index + 1}: ${issues.join(', ')}`);
      }
    });
  } else {
    // Validação para questões de múltipla escolha
    questions.forEach((q, index) => {
      const issues = [];
      
      if (!q || typeof q !== 'object') {
        issues.push('não é um objeto');
      } else {
        if (!q.question || typeof q.question !== 'string') {
          issues.push('campo "question" ausente ou inválido');
        }
        if (!Array.isArray(q.options)) {
          issues.push('campo "options" não é um array');
        } else if (q.options.length < 2) {
          issues.push(`"options" tem apenas ${q.options.length} item(s), mínimo é 2`);
        }
        if (typeof q.correctOption !== 'number') {
          issues.push('campo "correctOption" não é um número');
        } else if (Array.isArray(q.options) && (q.correctOption < 0 || q.correctOption >= q.options.length)) {
          issues.push(`"correctOption" (${q.correctOption}) fora do range de options`);
        }
      }

      if (issues.length === 0) {
        validQuestions.push(q);
      } else {
        invalidReasons.push(`Questão ${index + 1}: ${issues.join(', ')}`);
      }
    });
  }

  if (validQuestions.length === 0) {
    throw createDetailedError(
      ErrorTypes.NO_VALID_QUESTIONS,
      'Nenhuma questão válida encontrada.',
      {
        issue: 'Todas as questões têm problemas de formato',
        totalQuestions: questions.length,
        invalidReasons: invalidReasons.slice(0, 5) // Mostrar até 5 razões
      }
    );
  }

  // Log de aviso se algumas questões foram descartadas
  if (invalidReasons.length > 0) {
    console.warn(`parseGroqResponse - ${invalidReasons.length} questão(ões) inválida(s) descartada(s):`, invalidReasons);
  }

  return validQuestions;
};

/**
 * Gera questões usando a API GROQ com base no texto do PDF
 * @param {string} pdfText - Texto extraído do PDF
 * @param {number} numQuestions - Número de questões a gerar
 * @param {string} selectedModel - Modelo selecionado
 * @param {string} apiKey - Chave da API GROQ
 * @param {string} customPrompt - Prompt personalizado opcional
 * @param {Function} onProcessingStep - Callback para atualizar etapa de processamento
 * @param {string} questionType - Tipo de questão ('multiple' ou 'open')
 * @returns {Promise<Array>} - Array de questões geradas
 */
export const generateQuestionsWithGroq = async (
  pdfText,
  numQuestions,
  selectedModel,
  apiKey,
  customPrompt,
  onProcessingStep,
  questionType = QUESTION_TYPES.MULTIPLE_CHOICE
) => {
  try {
    const selectedModelInfo = GROQ_MODELS.find((m) => m.id === selectedModel);

    if (onProcessingStep) {
      onProcessingStep(
        `Gerando ${numQuestions} questões com ${
          selectedModelInfo?.name || selectedModel
        }...`
      );
    }

    if (!apiKey) {
      throw new Error(
        "Nenhuma chave API GROQ disponível. Configure uma chave nas configurações ou entre em contato com o suporte."
      );
    }

    // Preparar o prompt para o GROQ com o texto do PDF e o número de questões
    const prompt = createPrompt(pdfText, numQuestions, customPrompt, questionType);

    // URL da API GROQ
    const apiUrl = "https://api.groq.com/openai/v1/chat/completions";

    try {
      // Preparar o body separadamente para poder logar
      const systemPrompt = questionType === QUESTION_TYPES.OPEN
        ? "Você é um professor especializado em criar avaliações educacionais de alta qualidade. Retorne questões discursivas em formato JSON sem explicações adicionais."
        : "Você é um professor especializado em criar avaliações educacionais de alta qualidade. Retorne questões de múltipla escolha em formato JSON sem explicações adicionais.";

      // No free tier da GROQ o gargalo é o limite de tokens-por-minuto (TPM),
      // não o contexto do modelo. Tanto os tokens do prompt quanto o max_tokens
      // (reserva de saída) contam para o TPM. Por isso estimamos os tokens do
      // prompt (~4 chars/token) e reservamos o restante de um orçamento
      // conservador (abaixo do menor limite de TPM, ~6000) para a saída.
      const TPM_BUDGET = 5500;
      const estimatedPromptTokens = Math.ceil(prompt.length / 4) + 250; // +overhead de system/format
      const maxOutputTokens = Math.max(
        1024,
        Math.min(4000, TPM_BUDGET - estimatedPromptTokens)
      );

      const requestBody = {
        model: selectedModel,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.2,
        max_tokens: maxOutputTokens,
      };

      // Logs para diagnóstico
      console.debug("GROQ request -> apiUrl:", apiUrl);
      console.debug("GROQ request -> selectedModel:", selectedModel);
      console.debug("GROQ request -> selectedModelInfo:", selectedModelInfo);
      console.debug("GROQ request -> questionType:", questionType);
      console.debug("GROQ request -> prompt length:", prompt.length);
      console.debug("GROQ request -> requestBody (truncated):", {
        ...requestBody,
        messages: requestBody.messages.map((m) => ({
          ...m,
          content:
            m.content.slice(0, 1000) +
            (m.content.length > 1000 ? "...(truncated)" : ""),
        })),
      });

      // Enviar a solicitação para a API GROQ
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      // Se não OK, tente ler o body de resposta para diagnóstico
      if (!response.ok) {
        const respText = await response
          .text()
          .catch(() => "<unable to read response body>");
        console.error("GROQ resposta não OK:", response.status, respText);

        if (response.status === 401) {
          throw createDetailedError(
            ErrorTypes.API_KEY_INVALID,
            'A chave API GROQ fornecida é inválida ou expirou.',
            { statusCode: 401, responseBody: respText }
          );
        } else if (response.status === 404) {
          // Tentar extrair o nome do modelo da resposta
          let modelId = selectedModel;
          try {
            const errorData = JSON.parse(respText);
            if (errorData.error && errorData.error.message) {
              // Extrair modelo da mensagem de erro se possível
              const match = errorData.error.message.match(/model [`']([^`']+)[`']/i);
              if (match) modelId = match[1];
            }
          } catch (e) {
            // Ignorar erro de parse
          }
          throw createDetailedError(
            ErrorTypes.MODEL_NOT_FOUND,
            `O modelo "${modelId}" não está disponível.`,
            { statusCode: 404, modelId, responseBody: respText }
          );
        } else if (response.status === 429 || response.status === 413) {
          // 413 da GROQ = "Request too large" por tokens-por-minuto (TPM),
          // não tamanho do payload. 429 = limite de requisições atingido.
          // Tentar extrair o tempo de espera sugerido da mensagem.
          let waitTime;
          try {
            const errorData = JSON.parse(respText);
            const msg = errorData?.error?.message || '';
            const waitMatch = msg.match(/try again in ([\d.]+)s/i);
            if (waitMatch) waitTime = `${Math.ceil(parseFloat(waitMatch[1]))} segundos`;
          } catch (e) {
            // Ignorar erro de parse
          }
          throw createDetailedError(
            ErrorTypes.RATE_LIMIT,
            'Limite de tokens-por-minuto da API GROQ excedido.',
            { statusCode: response.status, waitTime, responseBody: respText }
          );
        } else if (response.status === 400) {
          // Mensagem específica para 400 incluindo corpo para ajudar debug
          throw createDetailedError(
            ErrorTypes.SERVER_ERROR,
            `Requisição inválida para o serviço GROQ.`,
            { statusCode: 400, responseBody: respText }
          );
        } else {
          throw createDetailedError(
            ErrorTypes.SERVER_ERROR,
            `Erro no serviço GROQ.`,
            { statusCode: response.status, responseBody: respText }
          );
        }
      }

      // Tentar parsear como JSON, mas se falhar logar texto cru
      let data;
      try {
        data = await response.json();
      } catch (jsonErr) {
        const raw = await response
          .text()
          .catch(() => "<unable to read response body>");
        console.error("Falha ao parsear JSON da GROQ. Body:", raw);
        throw new Error("Resposta da GROQ não está em JSON válido.");
      }

      const content = data?.choices?.[0]?.message?.content;
      if (!content) {
        console.error("Resposta GROQ sem campo content:", data);
        throw new Error(
          "Resposta inesperada da API GROQ. Verifique logs para detalhes."
        );
      }

      // Processar a resposta para extrair as questões
      const parsedQuestions = parseGroqResponse(content, questionType);

      // Validar cada questão de acordo com o tipo
      let validatedQuestions;
      if (questionType === QUESTION_TYPES.OPEN) {
        validatedQuestions = parsedQuestions.filter(
          (q) =>
            q &&
            q.question &&
            typeof q.question === 'string' &&
            q.expectedAnswer &&
            typeof q.expectedAnswer === 'string'
        );
      } else {
        validatedQuestions = parsedQuestions.filter(
          (q) =>
            q &&
            q.question &&
            Array.isArray(q.options) &&
            q.options.length >= 2 &&
            typeof q.correctOption === "number"
        );
      }

      if (validatedQuestions.length === 0) {
        throw new Error(
          "A IA não conseguiu gerar questões válidas baseadas neste texto."
        );
      }

      // Ajustar para o número exato de questões
      let finalQuestions;

      if (validatedQuestions.length > numQuestions) {
        // Se temos questões extras, pegamos apenas a quantidade solicitada
        finalQuestions = validatedQuestions.slice(0, numQuestions);
      } else if (validatedQuestions.length < numQuestions) {
        // Se faltam questões, duplicamos algumas com pequenas variações
        finalQuestions = [...validatedQuestions];
        const missingCount = numQuestions - validatedQuestions.length;

        for (let i = 0; i < missingCount; i++) {
          const baseIndex = i % validatedQuestions.length;
          const baseQuestion = validatedQuestions[baseIndex];

          // Cria variante para completar o número necessário
          if (questionType === QUESTION_TYPES.OPEN) {
            const newQuestion = {
              ...baseQuestion,
              question: `${baseQuestion.question} (variação ${i + 1})`,
            };
            finalQuestions.push(newQuestion);
          } else {
            const newQuestion = {
              ...baseQuestion,
              question: `${baseQuestion.question} (variação ${i + 1})`,
              options: [...baseQuestion.options],
            };
            finalQuestions.push(newQuestion);
          }
        }
      } else {
        finalQuestions = validatedQuestions;
      }

      // Adicionar IDs únicos
      return finalQuestions.map((q, index) => ({
        ...q,
        id:
          q.id || `pdf-gen-${Date.now()}-${index}-${uuidv4().substring(0, 8)}`,
      }));
    } catch (fetchError) {
      console.error("Erro na comunicação com a API:", fetchError);
      // Propaga o erro original (preservando errorType/details).
      // A formatação amigável acontece uma única vez na borda da UI.
      throw fetchError;
    }
  } catch (error) {
    console.error("Erro ao gerar questões:", error);
    // Propaga o erro original (preservando errorType/details).
    throw error;
  }
};

/**
 * Orquestra a geração de questões usando a Question Generator API como
 * provider primário e a GROQ como fallback.
 *
 * Regras (ver implementacao_agente_questoes.md):
 * - Tenta a nova API primeiro, quando habilitada/configurada.
 * - Em erro recuperável (timeout, rede, 502/503/504) faz fallback para GROQ.
 * - Em 400/401 (payload/chave) NÃO faz fallback silencioso: relança o erro.
 * - Se a nova API estiver desabilitada, usa GROQ diretamente.
 *
 * @returns {Promise<{questions: Array, provider: string}>}
 */
export const generateQuestionsWithFallback = async (
  pdfText,
  numQuestions,
  selectedModel,
  apiKey,
  customPrompt,
  onProcessingStep,
  questionType = QUESTION_TYPES.MULTIPLE_CHOICE,
  deps = {}
) => {
  const {
    questionApiEnabled = isQuestionApiEnabled,
    callQuestionApi = generateQuestionsWithQuestionApi,
    callGroq = generateQuestionsWithGroq,
  } = deps;

  // Marca se chegamos à GROQ por causa de uma falha do provedor primário.
  let usedFallback = false;

  if (questionApiEnabled()) {
    try {
      const questions = await callQuestionApi(
        pdfText,
        numQuestions,
        customPrompt,
        questionType,
        onProcessingStep
      );
      console.info("[QuestionGen] Provider usado: question_api (GPT-5.5)");
      return { questions, provider: QUESTION_PROVIDERS.QUESTION_API };
    } catch (error) {
      console.warn(
        "[QuestionGen] Question API (GPT-5.5) falhou:",
        `status=${error?.status ?? "?"}`,
        error?.message
      );

      if (!shouldFallbackToGroq(error)) {
        // 400 (payload) e afins: erro de configuração — não mascarar com fallback.
        console.error(
          "[QuestionGen] Erro não recuperável da Question API. Sem fallback.",
          error
        );
        throw error;
      }

      usedFallback = true;
      console.warn(
        "[QuestionGen] Erro recuperável na Question API. Acionando fallback para GROQ..."
      );
      if (onProcessingStep) {
        onProcessingStep("Provedor principal indisponível. Usando GROQ...");
      }
    }
  }

  try {
    const questions = await callGroq(
      pdfText,
      numQuestions,
      selectedModel,
      apiKey,
      customPrompt,
      onProcessingStep,
      questionType
    );
    console.info(
      `[QuestionGen] Provider usado: groq${usedFallback ? " (fallback)" : ""}`
    );
    return { questions, provider: QUESTION_PROVIDERS.GROQ };
  } catch (groqError) {
    // Diz claramente o que falhou: a GROQ (e se era o fallback do GPT).
    console.error(
      `[QuestionGen] GROQ${usedFallback ? " (fallback)" : ""} também falhou:`,
      groqError?.message,
      groqError
    );
    throw groqError;
  }
};

/**
 * Processa um arquivo PDF e gera questões a partir do seu conteúdo
 * @param {File} pdfFile - Arquivo PDF
 * @param {number} numQuestions - Número de questões a gerar
 * @param {string} selectedModel - ID do modelo selecionado
 * @param {string} apiKey - Chave API GROQ
 * @param {string} customPrompt - Prompt personalizado (opcional)
 * @param {Object} callbacks - Callbacks para atualizar UI
 * @param {string} questionType - Tipo de questão ('multiple' ou 'open')
 * @returns {Promise<{text: string, questions: Array}>} - Texto extraído e questões geradas
 */
export const processPdfAndGenerateQuestions = async (
  pdfFile,
  numQuestions,
  selectedModel,
  apiKey,
  customPrompt,
  callbacks = {},
  questionType = QUESTION_TYPES.MULTIPLE_CHOICE
) => {
  const { onProgress, onProcessingStep } = callbacks;

  try {
    if (onProcessingStep) {
      onProcessingStep('Extraindo texto do PDF...');
    }

    // Extrair texto do PDF (agora retorna objeto com text e stats)
    const extractResult = await extractTextFromPdf(pdfFile, onProgress, selectedModel, onProcessingStep);
    const { text, stats } = extractResult;

    // Log das estatísticas de extração
    console.debug('processPdfAndGenerateQuestions - Extração concluída:', stats);

    if (onProcessingStep) {
      let stepMsg = 'Texto extraído. ';
      if (stats.wasTruncated) {
        stepMsg += `(Texto truncado de ${stats.original} para ${stats.finalLength} caracteres) `;
      }
      stepMsg += 'Preparando geração de questões...';
      onProcessingStep(stepMsg);
    }

    if (onProgress) {
      onProgress(50);
    }

    // Gerar questões: Question API (primário) com fallback para GROQ
    const { questions, provider } = await generateQuestionsWithFallback(
      text,
      numQuestions,
      selectedModel,
      apiKey,
      customPrompt,
      onProcessingStep,
      questionType
    );

    if (onProgress) {
      onProgress(100);
    }

    return {
      text,
      questions,
      provider, // 'question_api' ou 'groq' — usado para feedback visual
      stats // Incluir estatísticas no retorno para diagnóstico
    };
  } catch (error) {
    console.error("Erro ao processar PDF:", error);
    // Propaga o erro original (preservando errorType/details) para que a UI
    // formate uma única vez via formatFriendlyError.
    throw error;
  }
};