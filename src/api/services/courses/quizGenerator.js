import * as pdfjs from "pdfjs-dist";
import { v4 as uuidv4 } from "uuid";

// Modelos GROQ disponíveis
export const GROQ_MODELS = [
  {
    id: "llama3-70b-8192",
    name: "Llama 3 70B (Recomendado)",
    maxContext: 8192,
  },
  { id: "llama3-8b-8192", name: "Llama 3 8B", maxContext: 8192 },
  { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B", maxContext: 32768 },
  { id: "gemma-7b-it", name: "Gemma 7B", maxContext: 8192 },
];

// Prompt padrão movido para uma função separada que pode ser modificada
export const createDefaultPrompt = (numQuestions) => `
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

// Parte fixa do prompt que garantirá o formato correto das respostas
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

/**
 * Cria o prompt completo para a API
 * @param {string} pdfText - Texto extraído do PDF
 * @param {number} numQuestions - Número de questões a serem geradas
 * @param {string} customPrompt - Prompt personalizado (opcional)
 * @returns {string} - Prompt completo
 */
export const createPrompt = (pdfText, numQuestions, customPrompt) => {
  // Se tivermos um prompt personalizado, use-o, caso contrário use o padrão
  const promptTemplate = customPrompt || createDefaultPrompt(numQuestions);

  // Adiciona as instruções fixas de formato JSON antes do texto do PDF
  return (
    promptTemplate +
    "\n\n" +
    JSON_FORMAT_INSTRUCTION +
    "\n\nO texto para análise é:\n\n" +
    pdfText
  );
};

/**
 * Função para formatar mensagens de erro amigáveis
 * @param {Error} error - Erro ocorrido
 * @returns {string} - Mensagem de erro formatada
 */
export const formatFriendlyError = (error) => {
  const errorMsg = error.message || String(error);

  // Casos comuns de erro com mensagens amigáveis
  if (errorMsg.includes("API GROQ") || errorMsg.includes("401")) {
    return "Erro de autenticação na API GROQ. Verifique se a chave API está correta e válida.";
  } else if (errorMsg.includes("429")) {
    return "Limite de requisições excedido. A API GROQ está sobrecarregada ou sua cota foi atingida. Tente novamente mais tarde.";
  } else if (
    errorMsg.includes("500") ||
    errorMsg.includes("502") ||
    errorMsg.includes("503")
  ) {
    return "Os servidores da GROQ estão com problemas neste momento. Tente novamente mais tarde.";
  } else if (
    errorMsg.includes("No content") ||
    errorMsg.includes("text content is empty")
  ) {
    return "Não foi possível extrair texto do PDF. O arquivo pode estar protegido ou contém apenas imagens.";
  } else if (errorMsg.includes("JSON")) {
    return "Erro ao processar as questões geradas pela IA. Tente novamente ou escolha outro modelo.";
  } else if (
    errorMsg.includes("NetworkError") ||
    errorMsg.includes("Failed to fetch")
  ) {
    return "Erro de conexão. Verifique sua internet e tente novamente.";
  } else if (errorMsg.includes("chave API")) {
    return errorMsg; // Já é uma mensagem amigável
  }

  // Caso genérico
  return `Erro: ${errorMsg}. Tente novamente ou entre em contato com o suporte.`;
};

/**
 * Extrai texto de um arquivo PDF
 * @param {File} file - Arquivo PDF
 * @param {Function} onProgress - Callback para atualizar progresso (0-50)
 * @param {string} selectedModel - ID do modelo selecionado
 * @returns {Promise<string>} - Texto extraído do PDF
 */
export const extractTextFromPdf = async (file, onProgress, selectedModel) => {
  try {
    // Defina o worker para o pdfjs
    pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;
    let text = "";

    for (let i = 1; i <= numPages; i++) {
      if (onProgress) {
        onProgress(Math.round((i / numPages) * 50)); // Primeira metade do progresso (0-50%)
      }
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((item) => item.str).join(" ");
      text += pageText + "\n";
    }

    // Ajustar o tamanho máximo com base no modelo selecionado
    const selectedModelInfo = GROQ_MODELS.find((m) => m.id === selectedModel);
    const maxContextSize = selectedModelInfo ? selectedModelInfo.maxContext : 8192;

    // Converter para tokens aproximados (1 token ~= 4 caracteres)
    // Mantendo margem para o prompt e resposta
    const maxLength = Math.floor(maxContextSize * 0.75 * 4);

    if (text.length > maxLength) {
      text = text.substring(0, maxLength) + "...";
    }

    if (!text.trim()) {
      throw new Error(
        "Não foi possível extrair texto deste PDF. O arquivo pode estar protegido ou contém apenas imagens."
      );
    }

    return text;
  } catch (error) {
    console.error("Erro ao extrair texto do PDF:", error);
    throw new Error(
      "Não foi possível ler o texto do PDF. O arquivo pode estar danificado ou protegido."
    );
  }
};

/**
 * Analisa a resposta da API GROQ para extrair as questões em formato JSON
 * @param {string} responseContent - Conteúdo da resposta da API
 * @returns {Array} - Array de questões analisadas
 */
export const parseGroqResponse = (responseContent) => {
  // Tentativa 1: Tentar analisar diretamente como JSON
  try {
    const parsed = JSON.parse(responseContent);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (e) {
    // Erro silencioso, tentaremos outro método
  }

  // Tentativa 2: Procurar por array JSON na resposta
  try {
    const jsonRegex = /\[\s*\{[\s\S]*\}\s*\]/g;
    const matches = responseContent.match(jsonRegex);
    if (matches && matches.length > 0) {
      return JSON.parse(matches[0]);
    }
  } catch (e) {
    // Erro silencioso, tentaremos outro método
  }

  // Tentativa 3: Procurar por blocos de código markdown
  try {
    const markdownCodeRegex = /```(?:json)?([\s\S]*?)```/g;
    const codeMatches = [...responseContent.matchAll(markdownCodeRegex)];
    if (codeMatches && codeMatches.length > 0) {
      const jsonContent = codeMatches[0][1].trim();
      return JSON.parse(jsonContent);
    }
  } catch (e) {
    // Erro silencioso, não há mais métodos
  }

  // Se chegou aqui, não conseguimos extrair o JSON
  throw new Error(
    "A IA não retornou as questões no formato correto. Tente novamente ou escolha outro modelo."
  );
};

/**
 * Gera questões usando a API GROQ com base no texto do PDF
 * @param {string} pdfText - Texto extraído do PDF
 * @param {number} numQuestions - Número de questões a gerar
 * @param {string} selectedModel - Modelo selecionado
 * @param {string} apiKey - Chave da API GROQ
 * @param {string} customPrompt - Prompt personalizado opcional
 * @param {Function} onProcessingStep - Callback para atualizar etapa de processamento
 * @returns {Promise<Array>} - Array de questões geradas
 */
export const generateQuestionsWithGroq = async (
  pdfText,
  numQuestions,
  selectedModel,
  apiKey,
  customPrompt,
  onProcessingStep
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
    const prompt = createPrompt(pdfText, numQuestions, customPrompt);

    // URL da API GROQ
    const apiUrl = "https://api.groq.com/openai/v1/chat/completions";

    try {
      // Enviar a solicitação para a API GROQ
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            {
              role: "system",
              content:
                "Você é um professor especializado em criar avaliações educacionais de alta qualidade. Retorne questões de múltipla escolha em formato JSON sem explicações adicionais.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.2,
          max_tokens: 4000,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(
            "A chave API GROQ fornecida é inválida ou expirou."
          );
        } else if (response.status === 429) {
          throw new Error(
            "Limite de requisições da API GROQ excedido. Tente novamente mais tarde."
          );
        } else {
          throw new Error(
            `Erro no serviço GROQ (código ${response.status}). Tente novamente mais tarde.`
          );
        }
      }

      const data = await response.json();
      const content = data.choices[0].message.content;

      // Processar a resposta para extrair as questões
      const parsedQuestions = parseGroqResponse(content);

      // Validar cada questão
      const validatedQuestions = parsedQuestions.filter(
        (q) =>
          q &&
          q.question &&
          Array.isArray(q.options) &&
          q.options.length >= 2 &&
          typeof q.correctOption === "number"
      );

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
          const newQuestion = {
            ...baseQuestion,
            question: `${baseQuestion.question} (variação ${i + 1})`,
            options: [...baseQuestion.options],
          };

          finalQuestions.push(newQuestion);
        }
      } else {
        finalQuestions = validatedQuestions;
      }

      // Adicionar IDs únicos
      return finalQuestions.map((q, index) => ({
        ...q,
        id:
          q.id ||
          `pdf-gen-${Date.now()}-${index}-${uuidv4().substring(0, 8)}`,
      }));
    } catch (fetchError) {
      console.error("Erro na comunicação com a API:", fetchError);
      throw new Error(
        fetchError.message ||
          "Erro ao comunicar com a API GROQ. Verifique sua conexão."
      );
    }
  } catch (error) {
    console.error("Erro ao gerar questões:", error);
    throw error;
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
 * @returns {Promise<{text: string, questions: Array}>} - Texto extraído e questões geradas
 */
export const processPdfAndGenerateQuestions = async (
  pdfFile,
  numQuestions,
  selectedModel,
  apiKey,
  customPrompt,
  callbacks = {}
) => {
  const { onProgress, onProcessingStep } = callbacks;
  
  try {
    // Extrair texto do PDF
    const text = await extractTextFromPdf(pdfFile, onProgress, selectedModel);
    
    if (onProgress) {
      onProgress(50);
    }

    // Gerar questões com GROQ
    const questions = await generateQuestionsWithGroq(
      text,
      numQuestions,
      selectedModel,
      apiKey,
      customPrompt,
      onProcessingStep
    );
    
    if (onProgress) {
      onProgress(100);
    }

    return {
      text,
      questions
    };
  } catch (error) {
    console.error("Erro ao processar PDF:", error);
    throw error;
  }
};