import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
// Imported for its side effect: a bad env fails at boot, not on the first API call.
import "./config/env";
import "./index.css";
import { followSystemTheme } from "./theme/system-theme";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

followSystemTheme();
const queryClient = new QueryClient();

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
