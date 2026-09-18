import * as pdfjs from "pdfjs-dist";
import { calcularOrcamento, cortarNoLimite } from "./tokenBudget";
import { ErrorTypes, createDetailedError } from "./errors";

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
 * Extrai texto de imagens do PDF usando OCR (Tesseract.js)
 * @param {File} file - Arquivo PDF
 * @param {Function} onProgress - Callback para atualizar progresso
 * @param {object} modelo - Registro do modelo no catálogo `llmModels`
 * @param {Function} onProcessingStep - Callback para atualizar etapa de processamento
 * @returns {Promise<{text: string, stats: Object, usedOcr: boolean}>}
 */
const extractTextFromPdfWithOcr = async (file, onProgress, modelo, onProcessingStep, numQuestions) => {
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

    // Corte pelo orçamento real do modelo escolhido. É um primeiro corte: o
    // definitivo acontece no groqClient, que sabe qual modelo da cadeia de
    // fallback vai de fato atender.
    const { maxPdfChars: maxLength } = calcularOrcamento(modelo, numQuestions);
    const { texto: finalText, truncado: wasTruncated } = cortarNoLimite(
      processedText,
      maxLength
    );

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
 * @param {object} modelo - Registro do modelo no catálogo `llmModels`
 * @param {Function} onProcessingStep - Callback para atualizar etapa de processamento
 * @returns {Promise<{text: string, stats: Object}>} - Texto extraído e estatísticas
 */
export const extractTextFromPdf = async (file, onProgress, modelo, onProcessingStep, numQuestions = 1) => {
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
        const ocrResult = await extractTextFromPdfWithOcr(file, onProgress, modelo, onProcessingStep, numQuestions);

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

    // Corte pelo orçamento real do modelo escolhido (contexto, teto de saída e
    // limite de tokens por minuto), em vez de "metade do contexto" de um
    // catálogo que vivia desatualizado dentro do código.
    const { maxPdfChars: maxLength } = calcularOrcamento(modelo, numQuestions);
    const { texto: finalText, truncado: wasTruncated } = cortarNoLimite(
      processedText,
      maxLength
    );

    if (wasTruncated) {
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
