import { QUESTION_TYPES } from "./constants";

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
