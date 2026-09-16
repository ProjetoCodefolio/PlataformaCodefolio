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
