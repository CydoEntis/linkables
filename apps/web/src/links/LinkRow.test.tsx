import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LinkRow } from "./LinkRow";
import { savedLink } from "./test-links";

const now = new Date(2026, 9, 22, 12, 0).getTime();

function renderRow(link = savedLink(), inCollection = false) {
  return render(<LinkRow link={link} now={now} inCollection={inCollection} />);
}

describe("LinkRow", () => {
  it("opens the saved URL in a new tab without passing the opener or referrer", () => {
    renderRow(savedLink({ originalUrl: "https://example.com/a?ref=1" }));
    const row = screen.getByRole("link");
    expect(row).toHaveAttribute("href", "https://example.com/a?ref=1");
    expect(row).toHaveAttribute("target", "_blank");
    expect(row).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("refuses to link a saved URL that is not http or https", () => {
    renderRow(savedLink({ originalUrl: "javascript:alert(1)", resource: { title: "Odd one" } }));
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("Odd one")).toBeInTheDocument();
  });

  it("shows the user's title over the fetched one", () => {
    renderRow(savedLink({ titleOverride: "My name for it", resource: { title: "Fetched title" } }));
    expect(screen.getByText("My name for it")).toBeInTheDocument();
    expect(screen.queryByText("Fetched title")).not.toBeInTheDocument();
  });

  it("shows the domain without www", () => {
    renderRow(savedLink({ originalUrl: "https://www.seriouseats.com/curry" }));
    expect(screen.getByText(/^seriouseats\.com/)).toBeInTheDocument();
  });

  it("shows the URL and Getting details… while metadata is pending", () => {
    renderRow(savedLink({ originalUrl: "https://example.com/new", resource: { title: null, fetchStatus: "pending" } }));
    expect(screen.getByText("example.com/new")).toBeInTheDocument();
    expect(screen.getByText(/Getting details…/)).toBeInTheDocument();
  });

  it("falls back to the URL, calmly, when the fetch failed", () => {
    renderRow(savedLink({ originalUrl: "https://example.com/gone", resource: { title: null, fetchStatus: "fetch_failed" } }));
    expect(screen.getByText("example.com/gone")).toBeInTheDocument();
    expect(screen.queryByText(/Getting details/)).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("uses the resource thumbnail only as an image source", () => {
    const { container } = renderRow(savedLink({ resource: { thumbnailUrl: "https://cdn.example.com/og.png" } }));
    const image = container.querySelector("img");
    expect(image).toHaveAttribute("src", "https://cdn.example.com/og.png");
    expect(image).toHaveAttribute("referrerpolicy", "no-referrer");
    expect(screen.getByRole("link")).toHaveAttribute("href", "https://example.com/article");
  });

  it("shows the domain's letter when there is no image", () => {
    renderRow(savedLink({ originalUrl: "https://doc.rust-lang.org/book" }));
    expect(screen.getByText("D")).toBeInTheDocument();
  });

  it("marks a pinned link", () => {
    renderRow(savedLink({ pinned: true }));
    expect(screen.getByRole("img", { name: "Pinned" })).toBeInTheDocument();
  });

  it("names the row after its title", () => {
    renderRow(savedLink({ resource: { title: "Rust by Example" } }));
    expect(screen.getByRole("link", { name: /^Rust by Example/ })).toBeInTheDocument();
  });

  it("says where the link is filed and which phone saved it", () => {
    renderRow(savedLink({ originalUrl: "https://youtube.com/w", savedFrom: "iphone", collections: [{ id: crypto.randomUUID(), name: "rust" }] }));
    expect(screen.getByText(/^youtube.com/)).toHaveTextContent("youtube.com · in Rust · from iPhone");
  });

  it("marks a link in no collection as To sort", () => {
    renderRow(savedLink({ originalUrl: "https://youtube.com/w" }));
    expect(screen.getByText(/^youtube.com/)).toHaveTextContent(/^youtube.com · To sort/);
  });

  it("leaves out where the link is filed on a collection page", () => {
    renderRow(savedLink({ collections: [{ id: crypto.randomUUID(), name: "Rust" }] }), true);
    expect(screen.queryByText(/in Rust/)).not.toBeInTheDocument();
  });
});
