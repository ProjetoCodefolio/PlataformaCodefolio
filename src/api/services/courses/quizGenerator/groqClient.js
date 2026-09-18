import { v4 as uuidv4 } from "uuid";
import { QUESTION_TYPES } from "./constants";
import { createPrompt } from "./promptBuilder";
import { ErrorTypes, createDetailedError } from "./errors";
import { parseGroqResponse } from "./responseParser";
import { calcularOrcamento, cortarNoLimite, deveUsarModoJson } from "./tokenBudget";

/**
 * Gera questões usando a API GROQ com base no texto do PDF
 * @param {string} pdfText - Texto extraído do PDF
 * @param {number} numQuestions - Número de questões a gerar
 * @param {object} modelo - Registro do modelo no catálogo `llmModels`
 * @param {string} apiKey - Chave da API GROQ
 * @param {string} customPrompt - Prompt personalizado opcional
 * @param {Function} onProcessingStep - Callback para atualizar etapa de processamento
 * @param {string} questionType - Tipo de questão ('multiple' ou 'open')
 * @returns {Promise<Array>} - Array de questões geradas
 */
export const generateQuestionsWithGroq = async (
  pdfText,
  numQuestions,
  modelo,
  apiKey,
  customPrompt,
  onProcessingStep,
  questionType = QUESTION_TYPES.MULTIPLE_CHOICE
) => {
  try {
    const modelId = modelo?.modelId;
    if (!modelId) {
      throw new Error("Nenhum modelo de IA foi informado para a geração.");
    }

    if (onProcessingStep) {
      onProcessingStep(
        `Gerando ${numQuestions} questões com ${modelo.name || modelId}...`
      );
    }

    if (!apiKey) {
      throw new Error(
        "Nenhuma chave API GROQ disponível. Configure uma chave nas configurações ou entre em contato com o suporte."
      );
    }

    // O orçamento é recalculado AQUI, e não só na extração do PDF, porque a
    // cadeia de fallback pode ter trocado o modelo depois que o texto foi
    // extraído: o próximo da fila pode ter um envelope menor que o primeiro.
    const orcamento = calcularOrcamento(modelo, numQuestions);
    const { texto: textoNoOrcamento, truncado } = cortarNoLimite(
      pdfText,
      orcamento.maxPdfChars
    );
    if (truncado) {
      console.warn(
        `generateQuestionsWithGroq - texto cortado de ${pdfText.length} para ` +
          `${textoNoOrcamento.length} caracteres pelo orçamento de ${modelId}.`
      );
    }

    // Preparar o prompt para o GROQ com o texto do PDF e o número de questões
    const prompt = createPrompt(textoNoOrcamento, numQuestions, customPrompt, questionType);

    // URL da API GROQ
    const apiUrl = "https://api.groq.com/openai/v1/chat/completions";

    try {
      // Preparar o body separadamente para poder logar
      const systemPrompt = questionType === QUESTION_TYPES.OPEN
        ? "Você é um professor especializado em criar avaliações educacionais de alta qualidade. Retorne questões discursivas em formato JSON sem explicações adicionais."
        : "Você é um professor especializado em criar avaliações educacionais de alta qualidade. Retorne questões de múltipla escolha em formato JSON sem explicações adicionais.";

      // Modo JSON quando o modelo suporta: com ele a resposta já vem JSON
      // válido, em vez de depender das cinco estratégias de recuperação do
      // responseParser. As instruções de formato já contêm a palavra "json",
      // que a Groq exige para aceitar `response_format`.
      const usarModoJson = deveUsarModoJson(modelo, orcamento.maxOutputTokens);

      const requestBody = {
        model: modelId,
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
        max_tokens: orcamento.maxOutputTokens,
        ...(usarModoJson ? { response_format: { type: "json_object" } } : {}),
      };

      // Logs para diagnóstico
      console.debug("GROQ request -> apiUrl:", apiUrl);
      console.debug("GROQ request -> modelo:", modelId);
      console.debug("GROQ request -> orçamento:", orcamento);
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
          let modeloDoErro = modelId;
          try {
            const errorData = JSON.parse(respText);
            if (errorData.error && errorData.error.message) {
              // Extrair modelo da mensagem de erro se possível
              const match = errorData.error.message.match(/model [`']([^`']+)[`']/i);
              if (match) modeloDoErro = match[1];
            }
          } catch (e) {
            // Ignorar erro de parse
          }
          throw createDetailedError(
            ErrorTypes.MODEL_NOT_FOUND,
            `O modelo "${modeloDoErro}" não está disponível.`,
            { statusCode: 404, modelId: modeloDoErro, responseBody: respText }
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

      const escolha = data?.choices?.[0];
      const content = escolha?.message?.content;
      const cortadaNoLimite = escolha?.finish_reason === "length";

      if (!content) {
        console.error("Resposta GROQ sem campo content:", data);

        // Modelo de raciocínio que gasta o orçamento inteiro pensando devolve
        // 200 com conteúdo vazio. Dizer "resposta inesperada" manda o
        // professor procurar um problema que não é dele: o que resolve é
        // pedir menos questões de uma vez.
        if (cortadaNoLimite) {
          throw createDetailedError(
            ErrorTypes.NO_VALID_QUESTIONS,
            `O modelo ${modelo.name || modelId} usou todo o espaço de resposta antes de escrever as questões.`,
            {
              issue: "finish_reason=length com conteúdo vazio",
              maxTokens: orcamento.maxOutputTokens,
              sugestao: "Peça menos questões de uma vez.",
            }
          );
        }

        throw new Error(
          "Resposta inesperada da API GROQ. Verifique logs para detalhes."
        );
      }

      if (cortadaNoLimite) {
        // Ainda dá para aproveitar: o parser recupera as questões completas e
        // descarta a última, pela metade. O aviso de quantas vieram já sai na
        // tela pelo ajuste de quantidade.
        console.warn(
          `generateQuestionsWithGroq - resposta cortada em ${orcamento.maxOutputTokens} tokens; ` +
            "recuperando as questões completas."
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

      // Ajustar para o número pedido. Se vieram menos questões válidas do que
      // o pedido, devolvemos o que veio: completar a lista duplicando questões
      // entrega ao professor questão inventada com cara de questão gerada.
      const finalQuestions =
        validatedQuestions.length > numQuestions
          ? validatedQuestions.slice(0, numQuestions)
          : validatedQuestions;

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
