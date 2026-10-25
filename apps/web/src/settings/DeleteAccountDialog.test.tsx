import { ApiError } from "@linkables/shared/api-client";
import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { testQueryClient } from "../test/render-with-router";
import { DeleteAccountDialog } from "./DeleteAccountDialog";

const request = vi.hoisted(() => vi.fn<(path: string, schema: unknown, init?: RequestInit) => Promise<unknown>>());
vi.mock("../api/api", () => ({ api: { request } }));
const { signOut, signOutEverywhere } = vi.hoisted(() => ({
  signOut: vi.fn<() => Promise<void>>(),
  signOutEverywhere: vi.fn<() => Promise<void>>(),
}));
vi.mock("../auth/supabase", () => ({ signOut, signOutEverywhere }));

function renderDialog() {
  const user = userEvent.setup();
  render(
    <QueryClientProvider client={testQueryClient()}>
      <DeleteAccountDialog open onOpenChange={() => undefined} />
    </QueryClientProvider>,
  );
  return user;
}

const confirmField = () => screen.getByRole("textbox", { name: "Type DELETE to confirm" });
const deleteButton = () => screen.getByRole("button", { name: "Delete account" });

async function confirmDelete() {
  const user = renderDialog();
  await user.type(confirmField(), "DELETE");
  await user.click(deleteButton());
}

beforeEach(() => {
  request.mockReset().mockResolvedValue(null);
  signOut.mockReset().mockResolvedValue();
  signOutEverywhere.mockReset().mockResolvedValue();
  vi.spyOn(toast, "success").mockReturnValue(1);
});

describe("DeleteAccountDialog", () => {
  it("does nothing until DELETE is typed", async () => {
    const user = renderDialog();

    await user.type(confirmField(), "delete");
    await user.click(deleteButton());

    expect(await screen.findByRole("alert")).toHaveTextContent("Type DELETE exactly as shown");
    expect(request).not.toHaveBeenCalled();
  });

  it("deletes the account, confirms it, and signs out everywhere", async () => {
    await confirmDelete();

    await waitFor(() => { expect(signOutEverywhere).toHaveBeenCalledOnce(); });
    expect(request).toHaveBeenCalledWith("/me", expect.anything(), { method: "DELETE" });
    expect(toast.success).toHaveBeenCalledWith("Your account is deleted", expect.anything());
  });

  it("still confirms the delete and signs this browser out when signing out everywhere fails", async () => {
    signOutEverywhere.mockRejectedValue(new Error("offline"));

    await confirmDelete();

    await waitFor(() => { expect(signOut).toHaveBeenCalledOnce(); });
    expect(toast.success).toHaveBeenCalledWith("Your account is deleted", expect.anything());
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
