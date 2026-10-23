import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BookmarkletDialog } from "./BookmarkletDialog";

function renderDialog() {
  const user = userEvent.setup();
  render(<BookmarkletDialog open onOpenChange={() => undefined} />);
  return { user, status: screen.getByRole("status") };
}

describe("BookmarkletDialog", () => {
  it("explains how to use the button when it is clicked instead of dragged", async () => {
    const { user, status } = renderDialog();
    expect(status).toHaveTextContent("");
    await user.click(screen.getByRole("link", { name: "Save to linkables" }));
    expect(status).toHaveTextContent("Drag it to your bookmarks bar, or use Copy the link.");
  });

  it("announces the next step in the same status line once the link is copied", async () => {
    const { user, status } = renderDialog();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    await user.click(screen.getByRole("button", { name: "Copy the link" }));
    expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/^javascript:/));
    await waitFor(() => { expect(status).toHaveTextContent("Now add a bookmark and paste this as its address."); });
    expect(screen.getByRole("status")).toBe(status);
  });
});
