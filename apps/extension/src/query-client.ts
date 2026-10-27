import { QueryClient } from "@tanstack/react-query";
import { CONNECTION_KEY } from "./auth/session";

export const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

// Clear in every open panel and popup when account or server changes.
if (typeof chrome !== "undefined") chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && CONNECTION_KEY in changes) queryClient.clear();
});
