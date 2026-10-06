import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { API_BASE } from "./api/client";
import "./index.css";

// Installer builds: the Tauri webview has no dev proxy, so root-relative backend paths
// (fetch("/api/..."), "/health", "/mcp") must go to the operator backend instead.
if (API_BASE) {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) =>
    typeof input === "string" && /^\/(api|health|mcp)(\/|\?|$)/.test(input)
      ? nativeFetch(`${API_BASE}${input}`, init)
      : nativeFetch(input, init);
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
