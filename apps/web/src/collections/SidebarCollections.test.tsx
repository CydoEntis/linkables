import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, createRootRoute, createRouter, RouterProvider } from "@tanstack/react-router";
import { act, createEvent, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@linkables/shared/api-client";
import { useLinksUi } from "../links/links-ui-store";
import { linksKeys } from "../links/use-links";
import { savedLink } from "../links/test-links";
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
let client: QueryClient;
function renderSidebar(activeId?: string) {
  const queryClient = client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
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

const LINK_DRAG_TYPE = "application/x-linkables-link";
const dragged = savedLink({ resource: { title: "Tokyo night walk" } });

function startDragging() {
  client.setQueryData(linksKeys.list("all"), { pages: [{ items: [dragged], cursor: null }], pageParams: [undefined] });
  act(() => { useLinksUi.getState().setDraggingId(dragged.id); });
}

function dropOn(target: HTMLElement) {
  const dataTransfer = { types: [LINK_DRAG_TYPE], getData: () => dragged.id, dropEffect: "" };
  fireEvent(target, createEvent.dragOver(target, { dataTransfer }));
  fireEvent(target, createEvent.drop(target, { dataTransfer }));
}

function hoverOver(target: HTMLElement) {
  fireEvent(target, createEvent.dragOver(target, { dataTransfer: { types: [LINK_DRAG_TYPE], dropEffect: "" } }));
}

beforeEach(() => {
  act(() => { useLinksUi.getState().setDraggingId(null); });
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

  describe("while a link is dragged", () => {
    it("marks every collection as a drop target and cues the one held over", async () => {
      renderSidebar();
      const row = await screen.findByRole("link", { name: /^Japan/ });
      expect(screen.queryByTestId("drop-cue")).not.toBeInTheDocument();
      startDragging();
      expect(screen.getByRole("heading", { name: "Drop on a collection" })).toBeInTheDocument();
      expect(row.className).toContain("outline-dashed");
      hoverOver(row);
      expect(within(row).getByTestId("drop-cue")).toHaveTextContent("Add");
      expect(screen.getAllByTestId("drop-cue")).toHaveLength(1);
    });

    it("says so when the link is already in the collection held over", async () => {
      renderSidebar();
      const row = await screen.findByRole("link", { name: /^Japan/ });
      dragged.collections.push({ id: japan.id, name: japan.name });
      startDragging();
      hoverOver(row);
      expect(within(row).getByTestId("drop-cue")).toHaveTextContent("Already in");
      dragged.collections.length = 0;
    });

    it("files the link in the collection it is dropped on", async () => {
      renderSidebar();
      const row = await screen.findByRole("link", { name: /^Japan/ });
      startDragging();
      dropOn(row);
      await waitFor(() => { expect(request).toHaveBeenCalledWith(`/collections/${japan.id}/links/${dragged.id}`, expect.anything(), { method: "PUT" }); });
      expect(useLinksUi.getState().draggingId).toBeNull();
    });
  });

  describe("with no collections", () => {
    beforeEach(() => {
      request.mockImplementation((path, _schema, init) => {
        if (init?.method === "POST") return Promise.resolve(listedCollection({ name: "Trip" }));
        return Promise.resolve(path === "/collections" ? { items: [] } : null);
      });
    });

    it("shows the start-a-collection box only while a link is dragged", async () => {
      renderSidebar();
      await screen.findByText("Collections you make show up here.");
      expect(screen.queryByText("Drop here to start a collection")).not.toBeInTheDocument();
      startDragging();
      expect(await screen.findByText("Drop here to start a collection")).toBeInTheDocument();
      expect(screen.getByText("Name it, and this link goes in.")).toBeInTheDocument();
      expect(screen.queryByText("Collections you make show up here.")).not.toBeInTheDocument();
      act(() => { useLinksUi.getState().setDraggingId(null); });
      expect(await screen.findByText("Collections you make show up here.")).toBeInTheDocument();
    });

    it("opens the name field on a drop and files the link in the new collection", async () => {
      const user = renderSidebar();
      await screen.findByText("Collections you make show up here.");
      startDragging();
      dropOn(await screen.findByTestId("start-drop-target"));
      await user.type(await screen.findByRole("textbox", { name: "New collection name" }), "Trip{Enter}");
      await waitFor(() => { expect(request.mock.calls.some(([path, , init]) => path.endsWith(`/links/${dragged.id}`) && init?.method === "PUT")).toBe(true); });
    });
  });
});
