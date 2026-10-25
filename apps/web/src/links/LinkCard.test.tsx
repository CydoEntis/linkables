import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithRouter } from "../test/render-with-router";
import { LinkCard } from "./LinkCard";
import { savedLink } from "./test-links";

const request = vi.hoisted(() => vi.fn<(path: string, schema: unknown, init?: RequestInit) => Promise<unknown>>());
vi.mock("../api/api", () => ({ api: { request } }));

const now = new Date(2026, 9, 22, 12, 0).getTime();

describe("LinkCard", () => {
  it("opens the link's own page, like a row", async () => {
    const link = savedLink();
    const { router } = await renderWithRouter(<LinkCard link={link} now={now} />);
    const card = screen.getByRole("link");
    expect(card).toHaveAttribute("href", `/l/${link.id}`);
    expect(card).toHaveAttribute("draggable", "true");
    await userEvent.click(card);
    expect(router.state.location.pathname).toBe(`/l/${link.id}`);
  });

  it("shows the title, the page's description and where it is filed", async () => {
    const link = savedLink({
      originalUrl: "https://www.japan-guide.com/fushimi",
      collections: [{ id: crypto.randomUUID(), name: "Trip to Japan" }],
      resource: { title: "Fushimi Inari Shrine", description: "Thousands of vermilion torii gates." },
    });
    await renderWithRouter(<LinkCard link={link} now={now} />);
    expect(screen.getByRole("link", { name: /^Fushimi Inari Shrine/ })).toBeInTheDocument();
    expect(screen.getByText("Thousands of vermilion torii gates.")).toBeInTheDocument();
    expect(screen.getByText(/^japan-guide\.com · in Trip to Japan$/)).toBeInTheDocument();
  });

  it("highlights the search in the description", async () => {
    const { container } = await renderWithRouter(
      <LinkCard link={savedLink({ resource: { description: "Thousands of vermilion torii gates." } })} now={now} query="torii" />,
    );
    expect([...container.querySelectorAll("mark")].map((mark) => mark.textContent)).toContain("torii");
  });

  it("marks a pinned link and a link in no collection", async () => {
    await renderWithRouter(<LinkCard link={savedLink({ pinned: true })} now={now} />);
    expect(screen.getByRole("link")).toHaveAccessibleName(/Pinned/);
    expect(screen.getByRole("img", { name: "Not in a collection" })).toBeInTheDocument();
  });

  it("offers the row's actions under the link's title", async () => {
    await renderWithRouter(<LinkCard link={savedLink({ resource: { title: "Ramen guide" } })} now={now} />);
    const actions = screen.getByRole("group", { name: "Ramen guide" });
    expect(actions).toContainElement(screen.getByRole("button", { name: "Share" }));
    expect(actions).toContainElement(screen.getByRole("button", { name: "Pin" }));
  });
});
