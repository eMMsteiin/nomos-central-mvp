import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Service Worker: registrar apenas em produção e fora de iframe/preview Lovable.
// Em iframes/preview, o SW serve cache stale e quebra hot reload.
(() => {
  if (!("serviceWorker" in navigator)) return;

  const isInIframe = (() => {
    try { return window.self !== window.top; } catch { return true; }
  })();
  const host = window.location.hostname;
  const isPreviewHost =
    host.includes("id-preview--") ||
    host.includes("lovableproject.com") ||
    host.includes("lovable.app");

  if (isInIframe || isPreviewHost || !import.meta.env.PROD) {
    // Garantir que nenhum SW antigo persista em contextos de preview
    navigator.serviceWorker.getRegistrations?.().then((regs) => {
      regs.forEach((r) => r.unregister());
    });
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("SW registration failed:", err);
    });
  });
})();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
