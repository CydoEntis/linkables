import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, createRootRoute, createRouter, RouterProvider } from "@tanstack/react-router";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@linkables/shared/api-client";
import { SidebarCollections } from "./SidebarCollections";
import { listedCollection } from "./test-collections";

const request = vi.hoisted(() => vi.fn<(path: string, schema: unknown, init?: RequestInit) => Promise<unknown>>());
vi.mock("../api/api", () => ({ api: { request } }));

const japan = listedCollection({
  name: "japan",
  cover: [{ kind: "page", thumbnailUrl: "https://cdn.example.com/og.png", domain: "example.com" }],
});
const music = listedCollection({ name: "Music", linkCount: 7 });
const middle = ["Watch later", "Rust", "Recipes", "Design", "Running", "Books"].map((name, index) =>
  listedCollection({ name, linkCount: index + 1 }),
);
const collections = [japan, ...middle, music];

// The sidebar's links need a router; any path renders it.
function renderSidebar(activeId?: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute({ component: () => <SidebarCollections activeId={activeId} /> });
  const router = createRouter({ routeTree: rootRoute, history: createMemoryHistory() });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

function listedNames() {
  return within(screen.getByRole("region", { name: /collections/i })).getAllByRole("link").map((link) => link.textContent);
}

beforeEach(() => {
  request.mockReset();
  request.mockImplementation((path, _schema, init) => {
    if (init?.method === "POST") return Promise.reject(new ApiError("CONFLICT", "A collection with that name already exists"));
    if (path === "/collections") return Promise.resolve({ items: collections });
    return Promise.resolve(null);
  });
});

describe("SidebarCollections", () => {
  it("lists every collection, capitalised, with its link count", async () => {
    renderSidebar();
    expect(await screen.findByRole("link", { name: /^Japan/ })).toBeInTheDocument();
    expect(listedNames()).toEqual(["Japan", "Watch later1", "Rust2", "Recipes3", "Design4", "Running5", "Books6", "Music7"]);
    expect(screen.queryByRole("button", { name: /Show all/ })).not.toBeInTheDocument();
  });

  it("marks the open collection as the current page", async () => {
    renderSidebar(music.id);
    await screen.findByRole("link", { name: /^Japan/ });
    expect(screen.getByRole("link", { name: /^Music/ })).toHaveAttribute("aria-current", "page");
  });

  it("says where collections will show up when there are none", async () => {
    request.mockImplementation((path) => Promise.resolve(path === "/collections" ? { items: [] } : null));
    renderSidebar();
    expect(await screen.findByText("Collections you make show up here.")).toBeInTheDocument();
  });

  it("draws each collection's 2×2 mini-cover from its cover tiles", async () => {
    renderSidebar();
    const japan = await screen.findByRole("link", { name: /^Japan/ });
    const image = japan.querySelector("img");
    expect(image).toHaveAttribute("src", "https://cdn.example.com/og.png");
    expect(image).toHaveAttribute("referrerpolicy", "no-referrer");
  });

  it("asks for a name before creating", async () => {
    const user = renderSidebar();
    await user.click(await screen.findByRole("button", { name: "New collection" }));
    await user.type(screen.getByRole("textbox", { name: "New collection name" }), "   {Enter}");
    expect(await screen.findByRole("alert")).toHaveTextContent("Give it a name");
    expect(request.mock.calls.some(([, , init]) => init?.method === "POST")).toBe(false);
  });

  it("says which collection the user already has when the name is taken", async () => {
    const user = renderSidebar();
    await screen.findByRole("link", { name: /^Japan/ });
    await user.click(screen.getByRole("button", { name: "New collection" }));
    await user.type(screen.getByRole("textbox", { name: "New collection name" }), "JAPAN{Enter}");
    expect(await screen.findByRole("alert")).toHaveTextContent("You already have Japan");
  });

  it("cancels the new name with Esc", async () => {
    const user = renderSidebar();
    await user.click(await screen.findByRole("button", { name: "New collection" }));
    await user.type(screen.getByRole("textbox", { name: "New collection name" }), "Trip{Escape}");
    await waitFor(() => { expect(screen.queryByRole("textbox", { name: "New collection name" })).not.toBeInTheDocument(); });
  });
});
