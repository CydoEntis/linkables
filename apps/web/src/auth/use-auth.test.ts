import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { act, renderHook } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import type { LinkProblem } from "./link-landing";
import { useAuth } from "./use-auth";

type Listener = (event: AuthChangeEvent, session: Session | null) => void;

const listeners = vi.hoisted(() => [] as Listener[]);
const pendingLinkProblem = vi.hoisted(() => {
  const holder: { resolve: (problem: LinkProblem | null) => void } = { resolve: () => undefined };
  return holder;
});

vi.mock("./supabase", () => ({
  supabase: {
    auth: {
      onAuthStateChange: (listener: Listener) => {
        listeners.push(listener);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    },
  },
}));
vi.mock("./link-landing", () => ({
  readLinkProblem: () =>
    new Promise<LinkProblem | null>((resolve) => {
      pendingLinkProblem.resolve = resolve;
    }),
}));

const session = { access_token: "token", user: { id: "user-1" } } as Session;

function emit(event: AuthChangeEvent, value: Session | null) {
  const listener = listeners.at(-1);
  if (!listener) throw new Error("useAuth did not subscribe");
  act(() => {
    listener(event, value);
  });
}

it("clears a rejected token fragment from the URL when already signed in", () => {
  window.history.replaceState(null, "", "/#access_token=a&refresh_token=b");
  renderHook(() => useAuth());
  emit("INITIAL_SESSION", session);
  expect(window.location.hash).toBe("");
});

it("stays signed in when the landing check finishes after a sign-in", async () => {
  const { result } = renderHook(() => useAuth());
  emit("INITIAL_SESSION", null);
  emit("SIGNED_IN", session);
  await act(async () => {
    pendingLinkProblem.resolve("expired");
    await Promise.resolve();
  });
  expect(result.current.status).toBe("signed-in");
});
