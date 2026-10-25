import { ApiError } from "@linkables/shared/api-client";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithRouter } from "../test/render-with-router";
import { wasAccountDeleted } from "./account-deleted";
import { DeleteAccountDialog } from "./DeleteAccountDialog";
import { ACCOUNT_DELETED_PATH } from "./path";

const request = vi.hoisted(() => vi.fn<(path: string, schema: unknown, init?: RequestInit) => Promise<unknown>>());
vi.mock("../api/api", () => ({ api: { request } }));
const { signOut, signOutEverywhere } = vi.hoisted(() => ({
  signOut: vi.fn<() => Promise<void>>(),
  signOutEverywhere: vi.fn<() => Promise<void>>(),
}));
vi.mock("../auth/supabase", () => ({ signOut, signOutEverywhere }));

async function renderDialog() {
  const user = userEvent.setup();
  const { router } = await renderWithRouter(<DeleteAccountDialog open onOpenChange={() => undefined} />);
  return { user, router };
}

const confirmField = () => screen.getByRole("textbox", { name: "Type DELETE to confirm" });
const deleteButton = () => screen.getByRole("button", { name: "Delete account" });

async function confirmDelete() {
  const rendered = await renderDialog();
  await rendered.user.type(confirmField(), "DELETE");
  await rendered.user.click(deleteButton());
  return rendered;
}

beforeEach(() => {
  request.mockReset().mockResolvedValue(null);
  signOut.mockReset().mockResolvedValue();
  signOutEverywhere.mockReset().mockResolvedValue();
});

afterEach(() => { sessionStorage.clear(); });

describe("DeleteAccountDialog", () => {
  it("puts the focus in the confirm field when it opens", async () => {
    await renderDialog();

    await waitFor(() => { expect(confirmField()).toHaveFocus(); });
  });

  it("keeps Delete account off until DELETE is typed", async () => {
    const { user } = await renderDialog();

    await user.type(confirmField(), "DELET");

    expect(deleteButton()).toBeDisabled();
  });

  it("uppercases what is typed, so delete counts", async () => {
    const { user } = await renderDialog();

    await user.type(confirmField(), "delete");

    expect(confirmField()).toHaveValue("DELETE");
    expect(deleteButton()).toBeEnabled();
  });

  it("deletes the account, shows the goodbye, and signs out everywhere", async () => {
    const { router } = await confirmDelete();

    await waitFor(() => { expect(signOutEverywhere).toHaveBeenCalledOnce(); });
    expect(request).toHaveBeenCalledWith("/me", expect.anything(), { method: "DELETE" });
    expect(router.state.location.pathname).toBe(ACCOUNT_DELETED_PATH);
    expect(wasAccountDeleted()).toBe(true);
  });

  it("still shows the goodbye and signs this browser out when signing out everywhere fails", async () => {
    signOutEverywhere.mockRejectedValue(new Error("offline"));

    const { router } = await confirmDelete();

    await waitFor(() => { expect(signOut).toHaveBeenCalledOnce(); });
    expect(router.state.location.pathname).toBe(ACCOUNT_DELETED_PATH);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("stays signed in and says so when the delete fails", async () => {
    request.mockRejectedValue(new ApiError("UPSTREAM", "Account deletion is unavailable right now."));

    await confirmDelete();

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't delete your account. Try again.");
    expect(signOutEverywhere).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });
});
