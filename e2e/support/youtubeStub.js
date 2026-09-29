// Player falso do YouTube.
//
// O app usa o `react-youtube`, que carrega https://www.youtube.com/iframe_api e
// cria um `YT.Player`. O progresso do aluno sai de `getCurrentTime()` e
// `getDuration()` desse player, lidos a cada poucos segundos e a cada
// `onStateChange` (ver VideoWatcher.jsx). Aqui o script da API é trocado por
// um `YT.Player` mínimo, que não toca nada e deixa o teste dizer onde o vídeo
// "está". Todo o resto (salvar o progresso, marcar assistido, destravar o
// próximo) roda de verdade.
//
// Uso, depois de `await installYouTubeStub(page)` e de abrir a sala:
//   await watchVideo(page, { percent: 95 });

// Estados da API do YouTube (YT.PlayerState).
export const PLAYER_STATE = { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, CUED: 5 };

// Roda no navegador. Mantém em `window.__ytStub` o player ativo, para o teste
// controlar. A duração padrão é 600 s (10 min) e o player nasce parado.
const STUB_SOURCE = `
(() => {
  const STATE = ${JSON.stringify(PLAYER_STATE)};

  class Player {
    constructor(elementOrId, options = {}) {
      const target =
        typeof elementOrId === "string" ? document.getElementById(elementOrId) : elementOrId;
      this._options = options;
      this._videoId = options.videoId || "";
      this._state = STATE.UNSTARTED;
      this._currentTime = 0;
      this._duration = 600;
      this._listeners = {};
      // O YouTube troca o elemento por um iframe; o react-youtube mexe nele.
      this._iframe = document.createElement("iframe");
      this._iframe.src = "about:blank";
      this._iframe.title = "Player falso do YouTube (E2E)";
      this._iframe.setAttribute("data-e2e-video-id", this._videoId);
      if (target && target.parentNode) target.parentNode.replaceChild(this._iframe, target);
      window.__ytStub.player = this;
      setTimeout(() => this._emit("onReady", undefined), 0);
    }

    _emit(eventName, data) {
      const event = { target: this, data };
      const fromOptions = this._options.events && this._options.events[eventName];
      if (fromOptions) fromOptions(event);
      for (const fn of this._listeners[eventName] || []) fn(event);
    }

    _setState(state) {
      this._state = state;
      this._emit("onStateChange", state);
    }

    addEventListener(eventName, fn) {
      (this._listeners[eventName] = this._listeners[eventName] || []).push(fn);
    }
    removeEventListener(eventName, fn) {
      this._listeners[eventName] = (this._listeners[eventName] || []).filter((f) => f !== fn);
    }

    getPlayerState() { return this._state; }
    getCurrentTime() { return this._currentTime; }
    getDuration() { return this._duration; }
    getVideoData() { return { video_id: this._videoId }; }
    getVideoUrl() { return "https://www.youtube.com/watch?v=" + this._videoId; }
    getIframe() { return this._iframe; }

    playVideo() { this._setState(STATE.PLAYING); }
    pauseVideo() { this._setState(STATE.PAUSED); }
    stopVideo() { this._setState(STATE.UNSTARTED); }
    seekTo(seconds) { this._currentTime = Math.max(0, Math.min(seconds, this._duration)); }
    cueVideoById(arg) { this._videoId = typeof arg === "string" ? arg : arg.videoId; }
    loadVideoById(arg) { this.cueVideoById(arg); this.playVideo(); }
    setSize() {}
    mute() {}
    unMute() {}
    isMuted() { return false; }
    setVolume() {}
    getVolume() { return 100; }
    destroy() {
      if (this._iframe.parentNode) this._iframe.parentNode.removeChild(this._iframe);
      if (window.__ytStub.player === this) window.__ytStub.player = null;
    }
  }

  window.__ytStub = { player: null };
  window.YT = { Player, PlayerState: STATE, loaded: 1 };
  if (typeof window.onYouTubeIframeAPIReady === "function") window.onYouTubeIframeAPIReady();
})();
`;

/**
 * Troca a API do YouTube pelo player falso nesta página. Chame antes de abrir
 * a sala. A rota da página vence o bloqueio de rede geral de support/test.js,
 * que continua barrando todo o resto do youtube.com.
 */
export const installYouTubeStub = async (page) => {
  await page.route(/^https?:\/\/www\.youtube\.com\/iframe_api/, (route) =>
    route.fulfill({ contentType: "text/javascript", body: STUB_SOURCE })
  );
};

/** Espera o player falso do vídeo `youtubeId` ficar pronto na página. */
export const waitForPlayer = (page, youtubeId) =>
  page.waitForFunction(
    (id) => window.__ytStub?.player?.getVideoData().video_id === id,
    youtubeId
  );

/**
 * Leva o vídeo atual a `percent` da duração e o deixa tocando, que é quando o
 * VideoWatcher mede e salva o progresso. Dispara também a troca de estado, que
 * faz o app medir na hora em vez de esperar o próximo ciclo de 5 s.
 */
export const watchVideo = (page, { percent }) =>
  page.evaluate((p) => {
    const player = window.__ytStub.player;
    player.seekTo((player.getDuration() * p) / 100);
    player.playVideo();
  }, percent);
