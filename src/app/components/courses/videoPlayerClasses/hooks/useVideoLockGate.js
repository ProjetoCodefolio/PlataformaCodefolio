import { useEffect, useState } from "react";

/**
 * Bloqueia o vídeo para quem não está logado, a partir do 3º vídeo do curso
 * (índice > 1) — os 2 primeiros ficam abertos como amostra.
 */
export function useVideoLockGate({ video, videos, userDetails }) {
  const [isVideoLockedState, setIsVideoLockedState] = useState(false);

  useEffect(() => {
    if (!userDetails?.userId && video && videos) {
      const videoIndex = videos.findIndex((v) => v.id === video.id);
      setIsVideoLockedState(videoIndex > 1);
    } else {
      setIsVideoLockedState(false);
    }
  }, [video, videos, userDetails]);

  return isVideoLockedState;
}
