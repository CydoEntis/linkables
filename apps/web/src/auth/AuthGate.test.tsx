import type { Session } from "./session";
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from "@tanstack/react-router";
import { EXTENSION_CONNECT_PATH } from "@linkables/shared/extension-sessions";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { EXTENSION_GUIDE_PATH } from "../extension-guide/path";
import { clearPendingSave, keepPendingSave, SAVE_PATH } from "../save/pending-save";
import { AuthGate } from "./AuthGate";

const signedIn = vi.hoisted(() => ({ current: true }));

vi.mock("../api/api", () => ({ api: { request: vi.fn() } }));
vi.mock("./use-auth", () => ({
  useAuth: () =>
    signedIn.current
      ? { status: "signed-in", session: { access_token: "token", user: { id: "user-1" } } as unknown as Session }
      : { status: "signed-out", linkProblem: null, afterSignOut: false },
}));

function renderAt(path: string) {
  const rootRoute = createRootRoute({ component: AuthGate });
  const page = (routePath: string) => createRoute({ getParentRoute: () => rootRoute, path: routePath, component: () => <p>{routePath}</p> });
  const router = createRouter({
    routeTree: rootRoute.addChildren([page("/"), page("/sign-in"), page(SAVE_PATH), page(EXTENSION_GUIDE_PATH), page(EXTENSION_CONNECT_PATH)]),
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  render(<RouterProvider router={router} />);
  return router;
}

afterEach(() => {
  clearPendingSave();
  signedIn.current = true;
});

it("shows the extension install guide to a visitor who is not signed in", async () => {
  signedIn.current = false;
  const router = renderAt(EXTENSION_GUIDE_PATH);
  expect(await screen.findByText(EXTENSION_GUIDE_PATH)).toBeInTheDocument();
  expect(router.state.location.pathname).toBe(EXTENSION_GUIDE_PATH);
});

it("sends a user who comes back signed in to the share they started", async () => {
  keepPendingSave("?url=https%3A%2F%2Fexample.test%2Fa");
  const router = renderAt("/sign-in");
  await waitFor(() => { expect(router.state.location.href).toBe("/save?url=https%3A%2F%2Fexample.test%2Fa"); });
});

it("sends a user who comes back signed in with nothing pending to their links", async () => {
  const router = renderAt("/sign-in");
  await waitFor(() => { expect(router.state.location.pathname).toBe("/"); });
});

it("brings a signed-out visit to the extension connect page back there after sign-in", async () => {
  signedIn.current = false;
  const signedOut = renderAt(EXTENSION_CONNECT_PATH);
  await waitFor(() => { expect(signedOut.state.location.pathname).toBe("/sign-in"); });
  cleanup();

  signedIn.current = true;
  const router = renderAt("/sign-in");
  await waitFor(() => { expect(router.state.location.pathname).toBe(EXTENSION_CONNECT_PATH); });
});


