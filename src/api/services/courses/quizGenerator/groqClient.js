import { v4 as uuidv4 } from "uuid";
import { GROQ_MODELS, QUESTION_TYPES } from "./constants";
import { createPrompt } from "./promptBuilder";
import { ErrorTypes, createDetailedError } from "./errors";
import { parseGroqResponse } from "./responseParser";

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
