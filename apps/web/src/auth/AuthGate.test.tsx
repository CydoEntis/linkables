import type { Session } from "@supabase/supabase-js";
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from "@tanstack/react-router";
import { render, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { clearPendingSave, keepPendingSave, SAVE_PATH } from "../save/pending-save";
import { AuthGate } from "./AuthGate";

vi.mock("./supabase", () => ({ returningFromSignIn: false }));
vi.mock("./use-auth", () => ({
  useAuth: () => ({ status: "signed-in", session: { access_token: "token", user: { id: "user-1" } } as Session }),
}));

function renderAt(path: string) {
  const rootRoute = createRootRoute({ component: AuthGate });
  const page = (routePath: string) => createRoute({ getParentRoute: () => rootRoute, path: routePath, component: () => null });
  const router = createRouter({
    routeTree: rootRoute.addChildren([page("/"), page("/sign-in"), page(SAVE_PATH)]),
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  render(<RouterProvider router={router} />);
  return router;
}

afterEach(() => { clearPendingSave(); });

it("sends a user who comes back signed in to the share they started", async () => {
  keepPendingSave("?url=https%3A%2F%2Fexample.test%2Fa");
  const router = renderAt("/sign-in");
  await waitFor(() => { expect(router.state.location.href).toBe("/save?url=https%3A%2F%2Fexample.test%2Fa"); });
});

it("sends a user who comes back signed in with nothing pending to their links", async () => {
  const router = renderAt("/sign-in");
  await waitFor(() => { expect(router.state.location.pathname).toBe("/"); });
});
