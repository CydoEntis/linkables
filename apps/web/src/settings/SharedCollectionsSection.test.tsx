import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithRouter } from "../test/render-with-router";
import { SharedCollectionsSection } from "./SharedCollectionsSection";

const request = vi.hoisted(() => vi.fn<(path: string, schema: unknown, init?: RequestInit) => Promise<unknown>>());
vi.mock("../api/api", () => ({ api: { request } }));

const TRIP = { id: "6f1b8f0e-8a54-4f7e-9d43-2b2a0b7b1c11", name: "trip", token: "Trip_Token-0123456789abcdefghijk" };
const MUSIC = { id: "0c5e6c1d-27b3-4bb0-8a49-6d0d3c1f2e22", name: "Music", token: "Music_Token-0123456789abcdefghij" };

function serve(items: (typeof TRIP)[]) {
  let shared = items;
  request.mockImplementation((path, _schema, init) => {
    if (path === "/collections/shared") return Promise.resolve({ items: shared });
    if (path === "/collections") return Promise.resolve({ items: [] });
    if (init?.method === "DELETE") {
      shared = shared.filter((item) => path !== `/collections/${item.id}/share`);
      return Promise.resolve({ token: null });
    }
    return Promise.reject(new Error(`unexpected ${path}`));
  });
}

const section = () => screen.getByRole("region", { name: "Shared collections" });
const row = (name: string) => screen.findByRole("listitem", { name });

beforeEach(() => { request.mockReset(); });

describe("SharedCollectionsSection", () => {
  it("says so when no collection has its link on", async () => {
    serve([]);
    await renderWithRouter(<SharedCollectionsSection />);

    expect(await within(section()).findByText(/Nothing is shared/)).toBeInTheDocument();
  });

  it("lists each shared collection, linking to it", async () => {
    serve([MUSIC, TRIP]);
    await renderWithRouter(<SharedCollectionsSection />);

    expect(await screen.findByRole("link", { name: "Trip" })).toHaveAttribute("href", `/c/${TRIP.id}`);
    expect(screen.getByRole("link", { name: "Music" })).toBeInTheDocument();
  });

  it("shows each collection's link without its scheme", async () => {
    serve([TRIP]);
    await renderWithRouter(<SharedCollectionsSection />);

    expect(within(await row("Trip")).getByText(`${window.location.host}/s/${TRIP.token}`)).toBeInTheDocument();
  });

  it("copies a collection's shared link", async () => {
    serve([TRIP]);
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    await renderWithRouter(<SharedCollectionsSection />);

    await user.click(within(await row("Trip")).getByRole("button", { name: "Copy link" }));

    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/s/${TRIP.token}`);
  });

  it("drops a collection from the list once its link is turned off with a second tap", async () => {
    serve([MUSIC, TRIP]);
    const user = userEvent.setup();
    await renderWithRouter(<SharedCollectionsSection />);

    await user.click(within(await row("Trip")).getByRole("button", { name: "Turn off link" }));
    expect(request).not.toHaveBeenCalledWith(`/collections/${TRIP.id}/share`, expect.anything(), expect.anything());
    await user.click(within(await row("Trip")).getByRole("button", { name: "Tap again to turn off" }));

    await waitFor(() => { expect(screen.queryByRole("link", { name: "Trip" })).not.toBeInTheDocument(); });
    expect(request).toHaveBeenCalledWith(`/collections/${TRIP.id}/share`, expect.anything(), { method: "DELETE" });
    expect(screen.getByRole("link", { name: "Music" })).toBeInTheDocument();
    expect(within(await row("Music")).getByRole("button", { name: "Copy link" })).toHaveFocus();
  });

  it("moves the focus to the heading when the last shared link is turned off", async () => {
    serve([TRIP]);
    const user = userEvent.setup();
    await renderWithRouter(<SharedCollectionsSection />);

    await user.click(within(await row("Trip")).getByRole("button", { name: "Turn off link" }));
    await user.click(within(await row("Trip")).getByRole("button", { name: "Tap again to turn off" }));

    await within(section()).findByText(/Nothing is shared/);
    expect(screen.getByRole("heading", { name: "Shared collections" })).toHaveFocus();
  });
});
