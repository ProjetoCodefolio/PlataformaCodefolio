import { useEffect } from "react";

/**
 * Suprime (só via log) um warning conhecido de inicialização do player do
 * YouTube. Não depende de nenhum estado do componente.
 */
export function useSuppressYoutubeWarning() {
  useEffect(() => {
    const handlePlayerError = (e) => {
      if (e.message && e.message.includes("Cannot read properties of null")) {
        console.warn(
          "[Classes] Detectado erro de inicialização do YouTube player"
        );
      }
    };

    window.addEventListener("error", handlePlayerError);

    return () => {
      window.removeEventListener("error", handlePlayerError);
    };
  }, []);
}
