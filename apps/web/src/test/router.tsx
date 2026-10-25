import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from "@tanstack/react-router";
import { createContext, use, useState, type ReactNode } from "react";

// What the routes render; a context, so a rerender can change it.
export const TestRouterPage = createContext<ReactNode>(null);

function CurrentPage() {
  return use(TestRouterPage);
}

// Lets components that read or write the URL render on their own, and link to
// the app's list and link pages. Children can change between renders.
export function TestRouter({ children, path = "/" }: { children: ReactNode; path?: string }) {
  const [router] = useState(() => createTestRouter(path));
  return (
    <TestRouterPage value={children}>
      <RouterProvider router={router} />
    </TestRouterPage>
  );
}

export function createTestRouter(path = "/") {
  const rootRoute = createRootRoute({ component: Outlet });
  const routeTree = rootRoute.addChildren([
    createRoute({ getParentRoute: () => rootRoute, path: "/", component: CurrentPage }),
    createRoute({ getParentRoute: () => rootRoute, path: "/c/$collectionId", component: CurrentPage }),
    createRoute({ getParentRoute: () => rootRoute, path: "/l/$linkId", component: CurrentPage }),
  ]);
  return createRouter({ routeTree, history: createMemoryHistory({ initialEntries: [path] }) });
}
