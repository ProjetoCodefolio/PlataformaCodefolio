import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { fetchAllLlmModels } from "$api/services/courses/llmModels";

// Excluir modelos que não suportam chat completions (áudio/STT/TTS), pois
// geram erro 400 ao serem usados para gerar questões.
const NON_CHAT_MODEL_PATTERN = /whisper|tts|guard|playai|distil-whisper/i;

/**
 * Configuração do provedor GROQ (usado como fallback do gerador de
 * questões): chave de API customizada e modelo selecionado, ambos
 * persistidos em `localStorage`.
 */
export function useGroqSettings() {
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);
  const [customApiKey, setCustomApiKey] = useState("");
  const [usingCustomApiKey, setUsingCustomApiKey] = useState(false);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("llama-3.3-70b-versatile");

  useEffect(() => {
    // Buscar modelos LLM disponíveis
    const loadModels = async () => {
      try {
        const fetchedModels = await fetchAllLlmModels();
        const modelsArray = Object.values(fetchedModels);
        const activeModels = modelsArray.filter(
          (model) => model.isActive && !NON_CHAT_MODEL_PATTERN.test(model.modelId || "")
        );
        setModels(activeModels);
      } catch (err) {
        console.error("Erro ao buscar modelos LLM:", err);
      }
    };

    loadModels();
  }, []);

  // Recuperar configurações salvas
  useEffect(() => {
    const savedApiKey = localStorage.getItem("groq_custom_api_key");
    const usingCustomKey = localStorage.getItem("groq_using_custom_key");
    const savedModel = localStorage.getItem("groq_selected_model");

    if (savedApiKey) setCustomApiKey(savedApiKey);
    if (usingCustomKey) setUsingCustomApiKey(usingCustomKey === "true");
    if (savedModel && models.some((m) => m.modelId === savedModel))
      setSelectedModel(savedModel);
  }, [models]);

  const handleOpenApiKeyDialog = () => setApiKeyDialogOpen(true);
  const handleCloseApiKeyDialog = () => setApiKeyDialogOpen(false);

  const handleSaveApiKey = () => {
    if (customApiKey.trim()) {
      localStorage.setItem("groq_custom_api_key", customApiKey.trim());
      localStorage.setItem("groq_using_custom_key", "true");
      setUsingCustomApiKey(true);
      toast.success("Chave API personalizada salva!");
    } else {
      localStorage.removeItem("groq_custom_api_key");
      localStorage.setItem("groq_using_custom_key", "false");
      setUsingCustomApiKey(false);
      toast.info("Usando chave API padrão do sistema");
    }
    setApiKeyDialogOpen(false);
  };

  const handleModelChange = (e) => {
    const newModel = e.target.value;
    setSelectedModel(newModel);
    localStorage.setItem("groq_selected_model", newModel);

    const selectedModelInfo = models.find((m) => m.modelId === newModel);
    toast.info(`Modelo alterado para: ${selectedModelInfo?.name || newModel}`);
  };

  // Determina qual chave API usar na geração: a customizada, se configurada,
  // senão a padrão do sistema (variável de ambiente).
  const resolveApiKey = () => {
    const usingSystemKey = !usingCustomApiKey || !customApiKey.trim();
    if (usingSystemKey) {
      return import.meta.env.VITE_GROQ_API_KEY || import.meta.env.REACT_APP_GROQ_API_KEY;
    }
    return customApiKey;
  };

  return {
    apiKeyDialogOpen,
    customApiKey,
    setCustomApiKey,
    usingCustomApiKey,
    setUsingCustomApiKey,
    models,
    selectedModel,
    handleOpenApiKeyDialog,
    handleCloseApiKeyDialog,
    handleSaveApiKey,
    handleModelChange,
    resolveApiKey,
  };
}
