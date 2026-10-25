import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Bundled with the extension: MV3 loads no remote code, and fonts from a CDN would be one more request per click.
import "@fontsource-variable/familjen-grotesk/wght.css";
// Latin only: Plex Mono sets the digits of the code and Unbounded the wordmark.
import "@fontsource/ibm-plex-mono/latin-500.css";
import "@fontsource/unbounded/latin-600.css";
import "./popup.css";
import { Popup } from "./Popup";
import { queryClient } from "./query-client";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Popup />
    </QueryClientProvider>
  </StrictMode>,
);
