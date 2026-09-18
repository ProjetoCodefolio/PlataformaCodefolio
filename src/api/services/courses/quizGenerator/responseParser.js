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
 * Extrai o array de questões cru de um texto que deveria conter JSON.
 *
 * Cinco estratégias, da mais direta à mais tolerante: JSON puro, objeto com
 * `.questions`, array embutido em prosa, bloco de código markdown, limpeza de
 * vírgula sobrando e aspas simples, e por fim recuperação objeto a objeto de
 * uma resposta truncada no meio.
 *
 * Vive separado da validação porque tem duas fontes: a resposta da IA e o
 * JSON que o professor cola na tela. Um segundo parser tolerante seria um
 * segundo conjunto de bugs.
 *
 * @param {string} conteudo - Texto que deveria conter o JSON das questões
 * @returns {Array} - Array de questões ainda não validadas
 */
export const extrairArrayDeQuestoes = (conteudo) => {
  if (!conteudo || typeof conteudo !== 'string') {
    throw createDetailedError(
      ErrorTypes.INVALID_RESPONSE_FORMAT,
      'A IA não retornou nenhum conteúdo.',
      { issue: 'Resposta vazia ou nula' }
    );
  }

  let parseError = null;
  let parsedData = null;

  // Tentativa 1: analisar diretamente como JSON
  try {
    parsedData = JSON.parse(conteudo);
    if (Array.isArray(parsedData)) {
      return parsedData;
    }
    if (parsedData && typeof parsedData === 'object' && Array.isArray(parsedData.questions)) {
      // Alguns modelos retornam { questions: [...] }
      return parsedData.questions;
    }
  } catch (e) {
    parseError = e.message;
  }

  // Tentativa 2: procurar por array JSON no meio do texto
  try {
    const matches = conteudo.match(/\[\s*\{[\s\S]*?\}\s*\]/g);
    for (const match of matches || []) {
      try {
        parsedData = JSON.parse(match);
        if (Array.isArray(parsedData) && parsedData.length > 0) {
          return parsedData;
        }
      } catch (innerE) {
        continue;
      }
    }
  } catch (e) {
    parseError = parseError || e.message;
  }

  // Tentativa 3: procurar por blocos de código markdown
  try {
    const codeMatches = [...conteudo.matchAll(/```(?:json)?([\s\S]*?)```/g)];
    for (const codeMatch of codeMatches) {
      try {
        parsedData = JSON.parse(codeMatch[1].trim());
        if (Array.isArray(parsedData)) {
          return parsedData;
        }
      } catch (innerE) {
        continue;
      }
    }
  } catch (e) {
    parseError = parseError || e.message;
  }

  // Tentativa 4: corrigir os erros comuns de formato
  try {
    const cleanedContent = conteudo
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
      return parsedData;
    }
  } catch (e) {
    parseError = parseError || e.message;
  }

  // Tentativa 5: recuperar questões completas de uma resposta truncada.
  // Quando o array é cortado por max_tokens (falta o "]" final), as tentativas
  // acima falham. Como os objetos de questão não têm chaves {} aninhadas
  // (options usa []), extraímos cada objeto {...} completo individualmente e
  // descartamos apenas o fragmento final incompleto.
  try {
    const objectMatches = conteudo.match(/\{[^{}]*\}/g);
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
          `extrairArrayDeQuestoes - Resposta truncada: recuperadas ${salvaged.length} questão(ões) completa(s) de ${objectMatches.length} bloco(s).`
        );
        return salvaged;
      }
    }
  } catch (e) {
    parseError = parseError || e.message;
  }

  // Nenhuma estratégia funcionou: montar o diagnóstico
  const contentPreview = conteudo.substring(0, 200);
  const hasJsonStart = conteudo.includes('[') || conteudo.includes('{');
  const hasJsonEnd = conteudo.includes(']') || conteudo.includes('}');

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

  console.error('extrairArrayDeQuestoes - Todas as tentativas falharam. Preview:', contentPreview);

  throw createDetailedError(
    ErrorTypes.JSON_PARSE_ERROR,
    'Não foi possível interpretar a resposta da IA.',
    {
      parseError: diagnosticMessage,
      contentPreview,
      hasJsonStart,
      hasJsonEnd,
      contentLength: conteudo.length
    }
  );
};

/**
 * Analisa a resposta da API GROQ para extrair as questões em formato JSON
 * @param {string} responseContent - Conteúdo da resposta da API
 * @param {string} questionType - Tipo de questão ('multiple' ou 'open')
 * @returns {Array} - Array de questões analisadas
 */
export const parseGroqResponse = (responseContent, questionType = QUESTION_TYPES.MULTIPLE_CHOICE) =>
  validateParsedQuestions(extrairArrayDeQuestoes(responseContent), questionType);
