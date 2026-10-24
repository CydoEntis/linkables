import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { clearPendingSave, keepPendingSave, SAVE_PATH } from "../save/pending-save";
import { AuthGate } from "./AuthGate";
import { SignInPage } from "./SignInScreen";

type Listener = (event: AuthChangeEvent, session: Session | null) => void;

const session = { access_token: "token", user: { id: "user-1", email: "owner@example.com" } } as Session;

const auth = vi.hoisted(() => {
  const listeners: Listener[] = [];
  const emit = (event: AuthChangeEvent, value: Session | null) => { for (const listener of listeners) listener(event, value); };
  return {
    emit,
    onAuthStateChange: (listener: Listener) => {
      listeners.push(listener);
      queueMicrotask(() => { listener("INITIAL_SESSION", null); });
      return { data: { subscription: { unsubscribe: () => listeners.splice(listeners.indexOf(listener), 1) } } };
    },
    initialize: () => Promise.resolve({ error: null }),
    signInWithOtp: () => Promise.resolve({ data: {}, error: null }),
    verifyOtp: vi.fn(),
  };
});
vi.mock("./supabase", () => ({ returningFromSignIn: false, supabase: { auth } }));

function renderApp(path: string) {
  const rootRoute = createRootRoute({ component: AuthGate });
  const routeTree = rootRoute.addChildren([
    createRoute({ getParentRoute: () => rootRoute, path: "/", component: () => null }),
    createRoute({ getParentRoute: () => rootRoute, path: "/sign-in", component: SignInPage }),
    createRoute({ getParentRoute: () => rootRoute, path: SAVE_PATH, component: () => null }),
  ]);
  const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: [path] }) });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

afterEach(() => { clearPendingSave(); });

it("takes a user who signs in with the code to the share they started", async () => {
  auth.verifyOtp.mockImplementation(() => {
    auth.emit("SIGNED_IN", session);
    return Promise.resolve({ data: { session }, error: null });
  });
  keepPendingSave("?url=https%3A%2F%2Fexample.test%2Fa");
  const router = renderApp("/sign-in");
  const user = userEvent.setup();

  await user.type(await screen.findByLabelText("Email"), "owner@example.com");
  await user.click(screen.getByRole("button", { name: "Email me a sign-in link" }));
  await user.type(await screen.findByLabelText("6-digit code"), "123456");

  await waitFor(() => { expect(router.state.location.href).toBe("/save?url=https%3A%2F%2Fexample.test%2Fa"); });
});
