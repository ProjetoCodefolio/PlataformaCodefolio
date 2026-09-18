import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { fetchAllLlmModels } from "$api/services/courses/llmModels";
import {
  cadeiaDeModelos,
  resolverModeloSelecionado,
} from "$api/services/courses/llmModelPolicy";

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
  const [modelsLoading, setModelsLoading] = useState(true);
  // Começa vazio de propósito: o modelo é resolvido quando o catálogo chega.
  // Um nome fixo aqui vira 404 silencioso no dia em que o provedor aposenta
  // o modelo, e foi exatamente o que aconteceu com o llama-3.3-70b-versatile.
  const [selectedModel, setSelectedModel] = useState("");

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
        setModels([]);
      } finally {
        setModelsLoading(false);
      }
    };

    loadModels();
  }, []);

  // Recuperar configurações salvas
  useEffect(() => {
    const savedApiKey = localStorage.getItem("groq_custom_api_key");
    const usingCustomKey = localStorage.getItem("groq_using_custom_key");

    if (savedApiKey) setCustomApiKey(savedApiKey);
    if (usingCustomKey) setUsingCustomApiKey(usingCustomKey === "true");
  }, []);

  // Resolver o modelo assim que o catálogo carrega: a preferência salva vale
  // só enquanto o modelo continuar ativo, senão a política escolhe.
  useEffect(() => {
    if (modelsLoading) return;

    const savedModel = localStorage.getItem("groq_selected_model");
    setSelectedModel(resolverModeloSelecionado(models, savedModel));
  }, [models, modelsLoading]);

  // Modelos a tentar se o selecionado tiver sumido do provedor, na ordem da
  // política. É o que evita que um 404 vire erro na cara do professor.
  const modelosAlternativos = useMemo(
    () => cadeiaDeModelos(models, selectedModel).filter((id) => id !== selectedModel),
    [models, selectedModel]
  );

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
    modelsLoading,
    // Sem modelo ativo no catálogo não há o que gerar: a tela precisa
    // bloquear o botão em vez de disparar uma requisição fadada ao 404.
    noActiveModels: !modelsLoading && models.length === 0,
    selectedModel,
    modelosAlternativos,
    handleOpenApiKeyDialog,
    handleCloseApiKeyDialog,
    handleSaveApiKey,
    handleModelChange,
    resolveApiKey,
  };
}
