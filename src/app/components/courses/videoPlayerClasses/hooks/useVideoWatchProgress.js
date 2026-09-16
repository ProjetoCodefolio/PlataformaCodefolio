import { useEffect, useRef, useState } from "react";
import { fetchVideoProgress } from "$api/services/courses/videoProgress";

/**
 * Percentual assistido e tempo de reprodução do vídeo atual, buscados do
 * banco quando o vídeo muda. `player` só é usado para reposicionar a
 * reprodução quando o vídeo troca com o player já pronto — de propósito
 * fora das dependências do segundo efeito, como no componente original.
 */
export function useVideoWatchProgress({ video, userDetails, player }) {
  const [percentageWatched, setPercentageWatched] = useState(video?.progress || 0);
  const [watchTime, setWatchTime] = useState(video?.watchedTime || 0);
  const hasNotifiedRef = useRef(video?.watched || false);

  useEffect(() => {
    const fetchWatchData = async () => {
      if (!video?.id || !video?.courseId) return;

      try {
        setWatchTime(0);
        setPercentageWatched(0);
        hasNotifiedRef.current = false;

        if (!userDetails?.userId) {
          setWatchTime(video.watchedTime || 0);
          setPercentageWatched(video.progress || 0);
          return;
        }

        const progress = await fetchVideoProgress(
          userDetails.userId,
          video.courseId,
          video.id
        );

        setWatchTime(progress.watchedTime);
        setPercentageWatched(progress.percentageWatched);
      } catch (error) {
        console.error("Erro ao buscar dados do vídeo:", error);
      }
    };

    fetchWatchData();

    return () => {
      setWatchTime(0);
      setPercentageWatched(0);
      hasNotifiedRef.current = false;
    };
  }, [video?.id, video?.courseId, userDetails?.userId]);

  useEffect(() => {
    if (video?.id) {
      setPercentageWatched(video.progress || 0);
      setWatchTime(video.watchedTime || 0);

      if (player && video.watchedTime > 0) {
        try {
          setTimeout(() => {
            if (player && typeof player.seekTo === "function") {
              player.seekTo(video.watchedTime);
            }
          }, 1000);
        } catch (error) {
          console.error("Erro ao posicionar vídeo:", error);
        }
      }
    }
  }, [video?.id, video?.watchedTime, video?.progress]);

  return { percentageWatched, setPercentageWatched, watchTime, setWatchTime, hasNotifiedRef };
}
