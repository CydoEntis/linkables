import type { ReaderBlock } from "@linkables/shared/reader";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReaderBlocks } from "./ReaderBlocks";

describe("ReaderBlocks", () => {
  it("renders page markup in text as text, never as elements", () => {
    const { container } = render(
      <ReaderBlocks blocks={[{ type: "paragraph", content: [{ text: `<img src=x onerror="alert(1)"><script>bad()</script>` }] }]} />,
    );

    expect(container.querySelector("img, script")).toBeNull();
    expect(container.textContent).toContain("<script>bad()</script>");
  });

  it("opens an article's links in a new tab without a referrer", () => {
    render(<ReaderBlocks blocks={[{ type: "paragraph", content: [{ text: "docs", href: "https://example.com/docs" }] }]} />);

    const link = screen.getByRole("link", { name: "docs" });
    expect(link).toHaveAttribute("href", "https://example.com/docs");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer nofollow");
  });

  it("drops a link that is not http(s) but keeps its text", () => {
    const blocks = [{ type: "paragraph", content: [{ text: "click", href: "javascript:alert(1)" }] }] as ReaderBlock[];
    render(<ReaderBlocks blocks={blocks} />);

    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("click")).toBeInTheDocument();
  });

  it("loads images lazily and sends no referrer", () => {
    render(<ReaderBlocks blocks={[{ type: "image", src: "https://cdn.example.com/a.png", alt: "Chart", caption: "Weekly" }]} />);

    const image = screen.getByRole("img", { name: "Chart" });
    expect(image).toHaveAttribute("loading", "lazy");
    expect(image).toHaveAttribute("referrerpolicy", "no-referrer");
    expect(screen.getByText("Weekly")).toBeInTheDocument();
  });
});
