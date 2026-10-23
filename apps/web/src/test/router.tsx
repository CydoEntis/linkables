import { createMemoryHistory, createRootRoute, createRouter, RouterContextProvider } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";

// Lets components with router Links render on their own, without mounting the app's routes.
export function TestRouter({ children }: { children: ReactNode }) {
  const [router] = useState(() => createRouter({ routeTree: createRootRoute(), history: createMemoryHistory() }));
  return <RouterContextProvider router={router}>{children}</RouterContextProvider>;
}
