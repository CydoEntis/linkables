import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithRouter } from "../test/render-with-router";
import { LinkRow } from "./LinkRow";
import { savedLink } from "./test-links";
import { PIN_HOLD_MS } from "./use-pin-link";

const request = vi.hoisted(() => vi.fn<(path: string, schema: unknown, init?: RequestInit) => Promise<unknown>>());
vi.mock("../api/api", () => ({ api: { request } }));

const now = new Date(2026, 9, 22, 12, 0).getTime();

function renderRow(link = savedLink(), inCollection = false) {
  return renderWithRouter(<LinkRow link={link} now={now} inCollection={inCollection} />);
}

describe("LinkRow", () => {
  it("opens the saved URL in a new tab", async () => {
    const link = savedLink({ originalUrl: "https://example.com/a?ref=1" });
    const { container } = await renderRow(link);
    const row = container.querySelector("[data-row-link]");
    expect(row).toHaveAttribute("href", "https://example.com/a?ref=1");
    expect(row).toHaveAttribute("target", "_blank");
    expect(row).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("opens a pending link's URL too", async () => {
    await renderRow(savedLink({ originalUrl: "https://example.com/new", resource: { title: null, fetchStatus: "pending" } }));
    expect(screen.getByRole("link", { name: /example\.com\/new/ })).toHaveAttribute("href", "https://example.com/new");
  });

  it("never gives the row a javascript: URL to run", async () => {
    const { container } = await renderRow(savedLink({ originalUrl: "javascript:alert(1)", resource: { title: "Odd one" } }));
    expect(container.querySelector("[data-row-link]")).not.toHaveAttribute("href");
  });

  it("offers Read, which opens the link's own page", async () => {
    const link = savedLink();
    const { router } = await renderRow(link);
    const reads = screen.getAllByRole("link", { name: "Read" });
    expect(reads).toHaveLength(2);
    for (const read of reads) expect(read).toHaveAttribute("href", `/l/${link.id}`);
    await userEvent.click(reads[0] as HTMLElement);
    expect(router.state.location.pathname).toBe(`/l/${link.id}`);
  });

  it("shows the user's title over the fetched one", async () => {
    await renderRow(savedLink({ titleOverride: "My name for it", resource: { title: "Fetched title" } }));
    expect(screen.getByText("My name for it")).toBeInTheDocument();
    expect(screen.queryByText("Fetched title")).not.toBeInTheDocument();
  });

  it("shows the domain without www", async () => {
    await renderRow(savedLink({ originalUrl: "https://www.seriouseats.com/curry" }));
    expect(screen.getByText(/^seriouseats\.com/)).toBeInTheDocument();
  });

  it("shows the URL and Getting details… while metadata is pending", async () => {
    await renderRow(savedLink({ originalUrl: "https://example.com/new", resource: { title: null, fetchStatus: "pending" } }));
    expect(screen.getByText("example.com/new")).toBeInTheDocument();
    expect(screen.getByText(/Getting details…/)).toBeInTheDocument();
  });

  it("falls back to the URL, calmly, when the fetch failed", async () => {
    await renderRow(savedLink({ originalUrl: "https://example.com/gone", resource: { title: null, fetchStatus: "fetch_failed" } }));
    expect(screen.getByText("example.com/gone")).toBeInTheDocument();
    expect(screen.queryByText(/Getting details/)).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("uses the resource thumbnail only as an image source", async () => {
    const { container } = await renderRow(savedLink({ resource: { thumbnailUrl: "https://cdn.example.com/og.png" } }));
    const image = container.querySelector("img");
    expect(image).toHaveAttribute("src", "https://cdn.example.com/og.png");
    expect(image).toHaveAttribute("referrerpolicy", "no-referrer");
  });

  it("shows the domain's letter when there is no image", async () => {
    await renderRow(savedLink({ originalUrl: "https://doc.rust-lang.org/book" }));
    expect(screen.getByText("D")).toBeInTheDocument();
  });

  it("keeps the page's description for big screens' second line", async () => {
    await renderRow(savedLink({ resource: { description: "A slow walk through Shibuya." } }));
    expect(screen.getByText("A slow walk through Shibuya.")).toHaveClass("3xl:block");
  });

  it("marks a pinned link", async () => {
    await renderRow(savedLink({ pinned: true }));
    expect(screen.getByRole("img", { name: "Pinned" })).toBeInTheDocument();
  });

  it("names the row after its title", async () => {
    await renderRow(savedLink({ resource: { title: "Rust by Example" } }));
    expect(screen.getByRole("link", { name: /^Rust by Example/ })).toBeInTheDocument();
  });

  it("says where the link is filed and which phone saved it", async () => {
    await renderRow(savedLink({ originalUrl: "https://youtube.com/w", savedFrom: "iphone", collections: [{ id: crypto.randomUUID(), name: "rust" }] }));
    expect(screen.getByText(/^youtube.com/)).toHaveTextContent("youtube.com · in Rust · from iPhone");
  });

  it("marks a link in no collection with a dot named for screen readers", async () => {
    await renderRow(savedLink());
    expect(screen.getByRole("img", { name: "Not in a collection" })).toBeInTheDocument();
  });

  it("leaves New out of the meta text of a link in no collection", async () => {
    await renderRow(savedLink({ originalUrl: "https://youtube.com/w" }));
    expect(screen.getByText(/^youtube.com/)).not.toHaveTextContent("New");
  });

  it("shows no dot for a link in a collection", async () => {
    await renderRow(savedLink({ collections: [{ id: crypto.randomUUID(), name: "rust" }] }));
    expect(screen.queryByRole("img", { name: "Not in a collection" })).not.toBeInTheDocument();
  });

  it("pins the link at once and asks the API to pin it", async () => {
    const link = savedLink();
    request.mockResolvedValue({ ...link, pinned: true });
    await renderRow(link);
    const pin = screen.getByTitle("Pin");
    await userEvent.click(pin);
    expect(pin).toHaveAttribute("aria-pressed", "true");
    expect(request).toHaveBeenCalledWith(`/links/${link.id}`, expect.anything(), expect.objectContaining({ method: "PATCH", body: JSON.stringify({ pinned: true }) }));
  });

  it("keeps showing the latest pin choice while earlier ones settle", async () => {
    const link = savedLink();
    request.mockResolvedValueOnce({ ...link, pinned: true }).mockReturnValue(new Promise(() => undefined));
    await renderRow(link);
    const pin = screen.getByTitle("Pin");
    await userEvent.click(pin);
    await userEvent.click(screen.getByTitle("Unpin"));
    await userEvent.click(screen.getByTitle("Pin"));
    await new Promise((resolve) => setTimeout(resolve, PIN_HOLD_MS + 300));
    expect(screen.getByTitle("Unpin")).toHaveAttribute("aria-pressed", "true");
  });

  it("groups the row actions under the link title for screen readers", async () => {
    await renderRow(savedLink({ resource: { title: "Rust by Example" } }));
    const groups = screen.getAllByRole("group", { name: "Rust by Example" });
    expect(groups.length).toBeGreaterThan(0);
    for (const group of groups) {
      expect(within(group).getByRole("link", { name: "Read" })).toBeInTheDocument();
      expect(within(group).getByRole("button", { name: /^Add to/ })).toBeInTheDocument();
      expect(within(group).getByRole("button", { name: "Share" })).toBeInTheDocument();
      expect(within(group).getByRole("button", { name: "Pin" })).toBeInTheDocument();
    }
  });

  it("offers Delete among the phone's swipe actions", async () => {
    await renderRow(savedLink({ resource: { title: "Rust by Example" } }));
    const tiles = screen.getAllByRole("group", { name: "Rust by Example" }).at(-1);
    expect(tiles && within(tiles).getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("leaves out where the link is filed on a collection page", async () => {
    await renderRow(savedLink({ collections: [{ id: crypto.randomUUID(), name: "Rust" }] }), true);
    expect(screen.queryByText(/in Rust/)).not.toBeInTheDocument();
  });
});
