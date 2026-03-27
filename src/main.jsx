import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/global.css";
import App from "./App.jsx";
import {
  initConsoleSecurityFilter,
  suppressSupabaseNetworkErrors,
} from "./lib/security-console.js";

// 🔒 Inicializa filtros de segurança (remove URLs sensíveis dos logs)
initConsoleSecurityFilter();
suppressSupabaseNetworkErrors();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
