import { ApiError } from "@linkables/shared/api-client";
import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { testQueryClient } from "../test/render-with-router";
import { DeleteAccountDialog } from "./DeleteAccountDialog";

const request = vi.hoisted(() => vi.fn<(path: string, schema: unknown, init?: RequestInit) => Promise<unknown>>());
vi.mock("../api/api", () => ({ api: { request } }));
const signOut = vi.hoisted(() => vi.fn<() => Promise<void>>());
vi.mock("../auth/supabase", () => ({ signOut }));

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

beforeEach(() => {
  request.mockReset().mockResolvedValue(null);
  signOut.mockReset().mockResolvedValue();
});

describe("DeleteAccountDialog", () => {
  it("does nothing until DELETE is typed", async () => {
    const user = renderDialog();

    await user.type(confirmField(), "delete");
    await user.click(deleteButton());

    expect(await screen.findByRole("alert")).toHaveTextContent("Type DELETE exactly as shown");
    expect(request).not.toHaveBeenCalled();
  });

  it("deletes the account, then signs out", async () => {
    const user = renderDialog();

    await user.type(confirmField(), "DELETE");
    await user.click(deleteButton());

    await waitFor(() => { expect(signOut).toHaveBeenCalledOnce(); });
    expect(request).toHaveBeenCalledWith("/me", expect.anything(), { method: "DELETE" });
  });

  it("stays signed in and says so when the delete fails", async () => {
    request.mockRejectedValue(new ApiError("INTERNAL", "boom"));
    const user = renderDialog();

    await user.type(confirmField(), "DELETE");
    await user.click(deleteButton());

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't delete your account. Try again.");
    expect(signOut).not.toHaveBeenCalled();
  });
});
