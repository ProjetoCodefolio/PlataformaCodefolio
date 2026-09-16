import { useEffect, useState } from "react";
import { checkSlideHasQuiz } from "$api/services/courses/slides";

/** Detecção de slide (vs. vídeo), normalização da URL de embed e checagem de quiz do slide. */
export function useSlidePlayer({ video }) {
  const [hasSlideQuiz, setHasSlideQuiz] = useState(false);
  const isSlide = video.isSlide || video.type === "slide";

  const formatSlideUrl = (url) => {
    if (!url) return "";

    try {
      url = url.trim();

      if (url.includes("<iframe") && url.includes("src=")) {
        const srcMatch = url.match(/src=["']([^"']+)["']/);
        if (srcMatch && srcMatch[1]) {
          return srcMatch[1];
        }
      }

      if (url.includes("embed") && url.includes("docs.google.com")) {
        return url;
      }

      if (url.includes("docs.google.com/presentation")) {
        if (url.includes("/edit")) {
          const baseUrl = url.split(/[?#]/)[0];
          return `${baseUrl.replace(
            "/edit",
            "/embed"
          )}?start=false&loop=false&delayms=3000`;
        }

        if (url.includes("/pub")) {
          return url.replace("/pub", "/embed");
        }

        if (!url.includes("/embed")) {
          const baseUrl = url.split(/[?#]/)[0];
          return `${baseUrl}/embed?start=false&loop=false&delayms=3000`;
        }
      }

      return url;
    } catch (error) {
      console.error("Erro ao formatar URL do slide:", error);
      return url;
    }
  };

  useEffect(() => {
    const checkForSlideQuiz = async () => {
      if (isSlide && video && video.id && video.courseId) {
        try {
          const hasQuiz = await checkSlideHasQuiz(video.courseId, video.id);
          setHasSlideQuiz(hasQuiz);
        } catch (error) {
          console.error("Erro ao verificar quiz do slide:", error);
        }
      }
    };

    checkForSlideQuiz();
  }, [isSlide, video]);

  return { isSlide, hasSlideQuiz, formatSlideUrl };
}
