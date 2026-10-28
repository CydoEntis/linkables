import type { Session } from "../auth/session";
import { screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthStateContext } from "../auth/auth-state";
import type { AuthState } from "../auth/use-auth";
import { renderWithRouter } from "../test/render-with-router";
import { markAccountDeleted } from "./account-deleted";
import { AccountDeletedPage } from "./AccountDeletedPage";

const { signOut, signOutEverywhere } = vi.hoisted(() => ({
  signOut: vi.fn<() => Promise<void>>(),
  signOutEverywhere: vi.fn<() => Promise<void>>(),
}));
vi.mock("../auth/session", () => ({ forgetSession: signOutEverywhere }));
vi.mock("../api/api", () => ({ api: { request: vi.fn() } }));

const SIGNED_OUT: AuthState = { status: "signed-out", linkProblem: null, afterSignOut: true };
const SIGNED_IN: AuthState = { status: "signed-in", session: { user: { email: "a@b.c" } } as unknown as Session };

function renderPage(auth: AuthState) {
  return renderWithRouter(
    <AuthStateContext value={auth}>
      <AccountDeletedPage />
    </AuthStateContext>,
    { path: "/c/somewhere" },
  );
}

beforeEach(() => {
  signOut.mockReset().mockResolvedValue();
  signOutEverywhere.mockReset().mockResolvedValue();
});

afterEach(() => { sessionStorage.clear(); });

describe("AccountDeletedPage", () => {
  it("sends anyone who didn't just delete an account to /", async () => {
    const { router } = await renderPage(SIGNED_OUT);

    await waitFor(() => { expect(router.state.location.pathname).toBe("/"); });
  });

  it("offers the way back once signed out", async () => {
    markAccountDeleted();
    await renderPage(SIGNED_OUT);

    expect(screen.getByRole("heading", { name: "Your account is deleted" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to linkables.app" })).toHaveAttribute("href", "/");
  });

  it("holds the way back and ends the sessions while still signed in", async () => {
    markAccountDeleted();
    await renderPage(SIGNED_IN);

    expect(screen.queryByRole("link", { name: "Back to linkables.app" })).not.toBeInTheDocument();
    await waitFor(() => { expect(signOutEverywhere).toHaveBeenCalledOnce(); });
  });
});


