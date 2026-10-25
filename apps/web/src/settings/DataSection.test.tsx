import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithRouter } from "../test/render-with-router";
import { DataSection } from "./DataSection";

const exportLinks = vi.hoisted(() => vi.fn<() => Promise<boolean>>());
vi.mock("../export/use-export-links", () => ({ useExportLinks: () => exportLinks }));

function deferred() {
  let resolve: (value: boolean) => void = () => undefined;
  const promise = new Promise<boolean>((done) => { resolve = done; });
  return { promise, resolve };
}

beforeEach(() => { exportLinks.mockReset(); });

describe("DataSection", () => {
  it("shows Preparing… while the export runs, then Downloaded", async () => {
    const pending = deferred();
    exportLinks.mockReturnValue(pending.promise);
    const user = userEvent.setup();
    await renderWithRouter(<DataSection />);

    await user.click(screen.getByRole("button", { name: "Export" }));
    expect(screen.getByRole("button", { name: "Preparing…" })).toBeDisabled();
    pending.resolve(true);

    expect(await screen.findByRole("button", { name: "Downloaded" })).toBeInTheDocument();
  });

  it("goes back to Export when the export fails", async () => {
    exportLinks.mockResolvedValue(false);
    const user = userEvent.setup();
    await renderWithRouter(<DataSection />);

    await user.click(screen.getByRole("button", { name: "Export" }));

    expect(await screen.findByRole("button", { name: "Export" })).toBeEnabled();
  });

  it("opens the delete confirm from Delete account…", async () => {
    const user = userEvent.setup();
    await renderWithRouter(<DataSection />);

    await user.click(screen.getByRole("button", { name: "Delete account…" }));

    expect(await screen.findByRole("dialog", { name: "Delete your account?" })).toBeInTheDocument();
  });
});
