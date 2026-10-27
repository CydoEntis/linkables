import type { SharedCollection as SharedCollectionData, SharedLink } from "@linkables/shared/sharing";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SharedCollection } from "./SharedCollection";

function link(title: string): SharedLink {
  return { url: `https://example.com/${title.toLowerCase()}`, title, description: null, thumbnailUrl: null, faviconUrl: null, kind: "page" };
}

function shared(overrides: Partial<SharedCollectionData> = {}): SharedCollectionData {
  return {
    name: "Trip",
    linkCount: 4,
    updatedAt: "2026-10-24T00:00:00.000Z",
    links: [link("Map")],
    groups: [
      { name: "Food", linkCount: 2, links: [link("Ramen"), link("Sushi")] },
      { name: "Hotels", linkCount: 1, links: [link("Ryokan")] },
    ],
    ...overrides,
  };
}

function renderShared(collection: SharedCollectionData, wide = true) {
  return render(<SharedCollection collection={collection} wide={wide} />);
}

afterEach(() => { vi.restoreAllMocks(); });

describe("SharedCollection with groups", () => {
  it("shows the ungrouped links first without a header, then a header per group with its count", () => {
    renderShared(shared());

    const headings = screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);
    expect(headings).toEqual(["Food2", "Hotels1"]);
    const order = screen.getAllByRole("link").map((item) => item.textContent);
    expect(order[0]).toContain("Map");
    expect(order.findIndex((text) => text.includes("Ramen"))).toBeGreaterThan(0);
  });

  it("puts each group's links inside its own section", () => {
    renderShared(shared());

    const food = screen.getByRole("region", { name: /Food/ });

    expect(within(food).getAllByRole("link")).toHaveLength(2);
    expect(within(food).queryByText("Ryokan")).not.toBeInTheDocument();
  });

  it("shows no header when the collection has no groups", () => {
    renderShared(shared({ groups: undefined, linkCount: 1 }));

    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
    expect(screen.getByText("Map")).toBeInTheDocument();
  });

  it("shows only group sections when there are no ungrouped links", () => {
    renderShared(shared({ links: [] }));

    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(2);
    expect(screen.queryByText("Nothing in this collection yet.")).not.toBeInTheDocument();
  });

  it("opens every visible link with Open all", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    renderShared(shared());

    await userEvent.click(screen.getByRole("button", { name: "Open all 4" }));

    expect(open).toHaveBeenCalledTimes(4);
  });

  it("lays the groups out as a list too", async () => {
    renderShared(shared());

    await userEvent.click(screen.getByRole("button", { name: "List" }));

    expect(screen.getByRole("region", { name: /Hotels/ })).toBeInTheDocument();
    expect(screen.getByText("Ryokan")).toBeInTheDocument();
  });

  it("ticks a link as opened inside a group", async () => {
    renderShared(shared());

    await userEvent.click(screen.getByRole("link", { name: /Ryokan/ }));

    expect(within(screen.getByRole("region", { name: /Hotels/ })).getByText("Opened")).toBeInTheDocument();
  });
});
