import { useState } from "react";
import { toast } from "react-toastify";
import { createDefaultPrompt } from "$api/services/courses/quizGenerator/promptBuilder";

/**
 * Prompt customizado (opcional) usado para gerar as questões. Quando não
 * habilitado, a geração usa o prompt padrão do tipo de questão selecionado.
 */
export function usePromptSettings({ numQuestions, questionType }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [usingCustomPrompt, setUsingCustomPrompt] = useState(false);

  const handleOpenSettings = () => {
    if (!customPrompt && !usingCustomPrompt) {
      setCustomPrompt(createDefaultPrompt(numQuestions, questionType));
    }
    setSettingsOpen(true);
  };

  const handleCloseSettings = () => setSettingsOpen(false);

  const handleSaveSettings = () => {
    if (customPrompt.trim()) {
      // Verifica se o prompt personalizado menciona o formato JSON esperado
      if (
        !customPrompt.includes('"question"') ||
        !customPrompt.includes('"options"') ||
        !customPrompt.includes('"correctOption"')
      ) {
        toast.warning(
          "Atenção: Seu prompt personalizado pode não especificar o formato JSON correto. As instruções de formato serão adicionadas automaticamente."
        );
      }

      setUsingCustomPrompt(true);
      toast.success("Configurações personalizadas de prompt salvas!");
    } else {
      setUsingCustomPrompt(false);
    }
    setSettingsOpen(false);
  };

  const handleResetPrompt = () => {
    setCustomPrompt(createDefaultPrompt(numQuestions, questionType));
    toast.info("Prompt restaurado para o padrão");
  };

  const getPromptToUse = () => (usingCustomPrompt ? customPrompt.trim() : null);

  return {
    settingsOpen,
    customPrompt,
    setCustomPrompt,
    usingCustomPrompt,
    handleOpenSettings,
    handleCloseSettings,
    handleSaveSettings,
    handleResetPrompt,
    getPromptToUse,
  };
}
