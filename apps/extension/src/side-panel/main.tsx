import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/familjen-grotesk/wght.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
import "@fontsource/unbounded/latin-600.css";
import "../popup.css";
import { queryClient } from "../query-client";
import { SidePanel } from "./SidePanel";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SidePanel />
    </QueryClientProvider>
  </StrictMode>,
);
