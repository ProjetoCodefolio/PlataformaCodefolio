import { useEffect } from "react";

const PLAYER_STYLES = `
  .youtube-player .ytp-chrome-bottom,
  .youtube-player .html5-video-container {
    background-color: #F5F5FA !important;
  }
  .youtube-player iframe {
    background-color: #F5F5FA !important;
  }
  .slide-iframe {
    border: none;
    border-radius: 12px;
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  }
`;

/** Injeta o CSS do player (fundo do YouTube/slide) uma única vez, por montagem. */
export function useInjectedPlayerStyles() {
  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.textContent = PLAYER_STYLES;
    document.head.appendChild(styleSheet);
    return () => document.head.removeChild(styleSheet);
  }, []);
}
