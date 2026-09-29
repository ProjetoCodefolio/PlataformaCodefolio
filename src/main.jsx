import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { USING_EMULATOR } from "$api/config/firebase";

// No `npm run dev` contra o emulador, o cron das publicações programadas roda
// dentro do app (em produção quem faz isso é o Worker do Cloudflare). Fora do
// dev esse trecho some da build.
if (import.meta.env.DEV && USING_EMULATOR) {
  import("./app/dev/localPublicationCron.js").then((m) => m.startLocalPublicationCron());
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
