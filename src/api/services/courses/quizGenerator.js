import * as pdfjs from "pdfjs-dist";
import { v4 as uuidv4 } from "uuid";

// Modelos GROQ disponíveis
export const GROQ_MODELS = [
  // Alibaba / Qwen (ajustado)
  { id: "qwen/qwen3-32b", name: "Qwen 3 32B (Recomendado)", maxContext: 65536 },

  // OpenAI OSS builds (ajustados)
  { id: "openai/gpt-oss-120b", name: "OpenAI GPT-OSS 120B", maxContext: 65536 },
  { id: "openai/gpt-oss-20b", name: "OpenAI GPT-OSS 20B", maxContext: 32768 },

  // Whisper (tts/transcrição — aumentados)
  { id: "whisper-large-v3", name: "Whisper Large v3 (ASR)", maxContext: 8192 },
  {
    id: "whisper-large-v3-turbo",
    name: "Whisper Large v3 Turbo (ASR)",
    maxContext: 8192,
  },

  // PlayAI (TTS)
  { id: "playai-tts", name: "PlayAI TTS", maxContext: 4096 },
  { id: "playai-tts-arabic", name: "PlayAI TTS (Arabic)", maxContext: 4096 },

  // Meta / LLaMA (aumentados onde aplicável)
  {
    id: "llama-3.1-8b-instant",
    name: "Llama 3.1 8B Instant",
    maxContext: 16384,
  },
  {
    id: "llama-3.3-70b-versatile",
    name: "Llama 3.3 70B Versatile",
    maxContext: 65536,
  },
  {
    id: "meta-llama/llama-4-maverick-17b",
    name: "Meta Llama 4 Maverick 17B",
    maxContext: 65536,
  },
  {
    id: "meta-llama/llama-4-scout-17b",
    name: "Meta Llama 4 Scout 17B",
    maxContext: 65536,
  },
  {
    id: "meta-llama/llama-guard-4-12b",
    name: "Meta Llama Guard 4 12B",
    maxContext: 32768,
  },
  {
    id: "meta-llama/llama-prompt-guard-2-22m",
    name: "Meta Llama Prompt Guard 2 (22M)",
    maxContext: 8192,
  },
  {
    id: "meta-llama/llama-prompt-guard-2-86m",
    name: "Meta Llama Prompt Guard 2 (86M)",
    maxContext: 8192,
  },

  // DeepSeek / outros
  {
    id: "deepseek-r1-distill-llama-70b",
    name: "DeepSeek R1 Distill Llama 70B",
    maxContext: 65536,
  },

  // Google / Gemma
  { id: "gemma2-9b-it", name: "Gemma 2 9B (IT)", maxContext: 16384 },

  // Groq models
  { id: "groq/compound", name: "Groq Compound", maxContext: 65536 },
  { id: "groq/compound-mini", name: "Groq Compound Mini", maxContext: 32768 },
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
  const errorMsg =
    (error && (error.message || String(error))) || "Erro desconhecido";

  // Mensagens amigáveis para o usuário (curtas e acionáveis)
  if (
    errorMsg.includes("401") ||
    errorMsg.toLowerCase().includes("chave api")
  ) {
    return "Erro de autenticação: verifique sua chave API nas configurações.";
  } else if (errorMsg.includes("429")) {
    return "Muito tráfego: limite de requisições atingido. Tente novamente daqui a alguns minutos.";
  } else if (
    errorMsg.includes("500") ||
    errorMsg.includes("502") ||
    errorMsg.includes("503")
  ) {
    return "Serviço temporariamente indisponível. Tente novamente mais tarde.";
  } else if (errorMsg.toLowerCase().includes("json")) {
    return "A IA retornou um formato inesperado. Tente gerar novamente ou experimente outro modelo.";
  } else if (
    errorMsg.toLowerCase().includes("texto") &&
    errorMsg.includes("empty")
  ) {
    return "Não foi possível extrair texto do PDF. Verifique se o arquivo não está protegido ou contém apenas imagens.";
  } else if (
    errorMsg.includes("NetworkError") ||
    errorMsg.includes("Failed to fetch")
  ) {
    return "Erro de conexão. Verifique sua internet e tente novamente.";
  } else if (errorMsg.includes("400")) {
    // incluir sugestão de ação para 400
    return "Requisição inválida para o serviço de IA. Tente reduzir o tamanho do arquivo ou o número de questões, e tente novamente.";
  }

  // Caso genérico curto
  return "Ocorreu um erro. Tente novamente ou entre em contato com o suporte se o problema persistir.";
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
    const maxContextSize = selectedModelInfo
      ? selectedModelInfo.maxContext
      : 8192;

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
      // Preparar o body separadamente para poder logar
      const requestBody = {
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
      };

      // Logs para diagnóstico
      console.debug("GROQ request -> apiUrl:", apiUrl);
      console.debug("GROQ request -> selectedModel:", selectedModel);
      console.debug("GROQ request -> selectedModelInfo:", selectedModelInfo);
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
          throw new Error("A chave API GROQ fornecida é inválida ou expirou.");
        } else if (response.status === 429) {
          throw new Error(
            "Limite de requisições da API GROQ excedido. Tente novamente mais tarde."
          );
        } else if (response.status === 400) {
          // Mensagem específica para 400 incluindo corpo para ajudar debug
          throw new Error(
            `Erro no serviço GROQ (código 400). Resposta: ${respText}`
          );
        } else {
          throw new Error(
            `Erro no serviço GROQ (código ${response.status}). Resposta: ${respText}`
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
          q.id || `pdf-gen-${Date.now()}-${index}-${uuidv4().substring(0, 8)}`,
      }));
    } catch (fetchError) {
      console.error("Erro na comunicação com a API:", fetchError);
      // relança mensagem amigável ao usuário, mantendo o log técnico
      throw new Error(formatFriendlyError(fetchError));
    }
  } catch (error) {
    console.error("Erro ao gerar questões:", error);
    // relança mensagem amigável ao usuário, mantendo o log técnico
    throw new Error(formatFriendlyError(error));
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
      questions,
    };
  } catch (error) {
    console.error("Erro ao processar PDF:", error);
    // relança mensagem amigável ao usuário
    throw new Error(formatFriendlyError(error));
  }
};
