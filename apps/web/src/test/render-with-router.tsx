import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { createTestRouter, TestRouterPage } from "./router";

type RenderOptions = { path?: string; queryClient?: QueryClient };

// Renders once the router has loaded, so tests can query at once and read router.state.
export async function renderWithRouter(ui: ReactNode, { path = "/", queryClient = testQueryClient() }: RenderOptions = {}) {
  const router = createTestRouter(path);
  await router.load();
  const result = render(
    <QueryClientProvider client={queryClient}>
      <TestRouterPage value={ui}>
        <RouterProvider router={router} />
      </TestRouterPage>
    </QueryClientProvider>,
  );
  return { ...result, router, queryClient };
}

export function testQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}
