import { useEffect, useState } from "react";

/**
 * API imperativa do player do YouTube (exposta via `ref`) e a lógica de
 * retry quando o player falha ao carregar.
 *
 * `onReady` recebe `setPercentageWatched`/`setWatchTime` como parâmetros (e
 * não como dependência do hook em si) porque esses setters pertencem a
 * useVideoWatchProgress: passá-los aqui na chamada evita que os dois hooks
 * precisem um do outro para serem instanciados.
 */
export function useYoutubePlayerImperative({ ref, video }) {
  const [player, setPlayer] = useState(null);
  const [playerLoadAttempt, setPlayerLoadAttempt] = useState(0);
  const [playerError, setPlayerError] = useState(false);

  const onReady = (event, setPercentageWatched, setWatchTime) => {
    const playerInstance = event.target;

    if (!playerInstance) {
      return;
    }

    const isPlayerReady = () => {
      try {
        return (
          playerInstance &&
          typeof playerInstance.getPlayerState === "function" &&
          playerInstance.getPlayerState() !== undefined
        );
      } catch (e) {
        return false;
      }
    };

    const safeSeekTo = (time) => {
      try {
        if (!isPlayerReady()) {
          return;
        }
        playerInstance.seekTo(time);
      } catch (e) {
        console.error("Erro ao chamar seekTo:", e);
      }
    };

    ref.current = {
      seekTo: safeSeekTo,
      updateProgress: (progress, time) => {
        setPercentageWatched(progress);
        setWatchTime(time);
      },
      player: playerInstance,
      pause: () => {
        try {
          if (isPlayerReady()) {
            playerInstance.pauseVideo();
          }
        } catch (e) {
          console.error("Erro ao pausar vídeo:", e);
        }
      },
      getCurrentTime: () => {
        try {
          return isPlayerReady() ? playerInstance.getCurrentTime() : 0;
        } catch (e) {
          console.error("Erro ao obter tempo atual:", e);
          return 0;
        }
      },
      getDuration: () => {
        try {
          return isPlayerReady() ? playerInstance.getDuration() : 0;
        } catch (e) {
          console.error("Erro ao obter duração:", e);
          return 0;
        }
      },
    };

    setPlayer(playerInstance);

    const startTime = video?.watchedTime || 0;
    if (startTime > 0) {
      let attempts = 0;
      const maxAttempts = 5;

      const trySeekTo = () => {
        if (attempts >= maxAttempts) {
          return;
        }

        attempts++;

        try {
          if (
            isPlayerReady() &&
            playerInstance.getIframe &&
            playerInstance.getIframe() &&
            playerInstance.getIframe().src
          ) {
            const duration = playerInstance.getDuration();
            if (isNaN(duration) || duration <= 0) {
              setTimeout(trySeekTo, 1000 * attempts);
              return;
            }

            const safeTime = Math.min(startTime, duration - 1);
            playerInstance.seekTo(safeTime);
          } else {
            setTimeout(trySeekTo, 1000 * attempts);
          }
        } catch (e) {
          setTimeout(trySeekTo, 1000 * attempts);
        }
      };

      setTimeout(trySeekTo, 1500);
    }
  };

  // Sem isso, um vídeo que falhou e esgotou as tentativas deixava
  // `playerLoadAttempt` em 3 para sempre: ao navegar para o PRÓXIMO vídeo
  // (que carrega normalmente), o fallback de erro continuava aparecendo no
  // lugar do player, porque a condição olha só o número de tentativas.
  useEffect(() => {
    setPlayerError(false);
    setPlayerLoadAttempt(0);
  }, [video?.id]);

  useEffect(() => {
    if (playerError && playerLoadAttempt < 3) {
      const timer = setTimeout(() => {
        setPlayerLoadAttempt((prev) => prev + 1);
        setPlayerError(false);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [playerError, playerLoadAttempt]);

  return { player, playerError, playerLoadAttempt, onReady, setPlayerError };
}
