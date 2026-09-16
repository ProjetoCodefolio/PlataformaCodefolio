import { QUESTION_TYPES } from "./constants";
import { ErrorTypes, createDetailedError } from "./errors";

/**
 * Valida e filtra questões parseadas, retornando erro detalhado se inválidas
 * @param {Array} questions - Array de questões parseadas
 * @param {string} questionType - Tipo de questão ('multiple' ou 'open')
 * @returns {Array} - Array de questões validadas
 */
export const validateParsedQuestions = (questions, questionType = QUESTION_TYPES.MULTIPLE_CHOICE) => {
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
