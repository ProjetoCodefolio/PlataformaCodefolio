import { useEffect, useState } from "react";
import { fetchAdvancedSettings } from "$api/services/courses/advancedSettings";

/**
 * Configurações avançadas do curso (regras de conclusão sequencial de vídeo,
 * exibição de resultado do quiz). `openAdvancedSettings` nunca é setado como
 * `true` em lugar nenhum do sistema hoje — preservado tal como está, não é
 * escopo desta refatoração decidir o que fazer com isso.
 */
export function useAdvancedSettingsPanel(courseId) {
  const [advancedSettings, setAdvancedSettings] = useState({
    videos: { requirePreviousCompletion: true },
    quiz: { allowRetry: true, showResultAfterCompletion: true },
  });
  const [openAdvancedSettings, setOpenAdvancedSettings] = useState(false);

  useEffect(() => {
    const loadAdvancedSettings = async () => {
      try {
        if (courseId) {
          const settings = await fetchAdvancedSettings(courseId);
          setAdvancedSettings(settings);
        }
      } catch (error) {
        console.error("Erro ao carregar configurações avançadas:", error);
      }
    };

    loadAdvancedSettings();
  }, [courseId]);

  return {
    advancedSettings,
    setAdvancedSettings,
    openAdvancedSettings,
    setOpenAdvancedSettings,
  };
}
