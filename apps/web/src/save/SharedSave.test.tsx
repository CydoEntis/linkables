import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, createRootRoute, createRouter, RouterProvider } from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Toaster } from "@/components/ui/sonner";
import { ApiError } from "../api/client";
import { savedLink } from "../links/test-links";
import { SharedSave } from "./SavePage";

type Request = (path: string, schema: unknown, init?: RequestInit) => Promise<unknown>;
const request = vi.hoisted(() => vi.fn<Request>());
vi.mock("../api/api", () => ({ api: { request } }));

type Answers = { save?: (url: string) => Promise<unknown>; collections?: unknown[]; listed?: unknown[] };

function answer({ save = () => new Promise(() => undefined), collections = [], listed = [] }: Answers) {
  request.mockImplementation((path, _schema, init) => {
    const method = init?.method ?? "GET";
    if (path === "/links" && method === "POST") return save((JSON.parse(init?.body as string) as { url: string }).url);
    if (path === "/links" && method === "GET") return Promise.resolve({ items: listed, cursor: null });
    if (path === "/collections") return Promise.resolve({ items: collections });
    return Promise.resolve(null);
  });
}

function calls(method: string, path: string | RegExp) {
  return request.mock.calls.filter(
    ([callPath, , init]) => (init?.method ?? "GET") === method && (typeof path === "string" ? callPath === path : path.test(callPath)),
  );
}

function renderShared(sharedUrl: string | null) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute({ component: () => <SharedSave sharedUrl={sharedUrl} /> });
  const router = createRouter({ routeTree: rootRoute, history: createMemoryHistory({ initialEntries: ["/save"] }) });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

function saved(overrides: Parameters<typeof savedLink>[0] = {}) {
  return { ...savedLink({ resource: { title: null, fetchStatus: "pending" }, ...overrides }), duplicate: false };
}

beforeEach(() => {
  request.mockReset();
  // The router restores scroll on navigation; jsdom has no scrolling.
  vi.stubGlobal("scrollTo", vi.fn());
});

describe("SharedSave", () => {
  it("shows Saving while the link is being saved", async () => {
    answer({});
    renderShared("https://example.test/a");
    expect(await screen.findByRole("heading", { name: "Saving…" })).toBeInTheDocument();
    expect(screen.getByText("https://example.test/a")).toBeInTheDocument();
  });

  it("saves the shared link once and shows Saved to linkables", async () => {
    const link = saved({ originalUrl: "https://example.test/a" });
    answer({ save: () => Promise.resolve(link) });
    renderShared("https://example.test/a");
    expect(await screen.findByRole("heading", { name: "Saved to linkables" })).toBeInTheDocument();
    expect(screen.getByText("example.test/a")).toBeInTheDocument();
    expect(calls("POST", "/links")).toHaveLength(1);
    expect(JSON.parse(calls("POST", "/links")[0]?.[2]?.body as string)).toMatchObject({ url: "https://example.test/a" });
  });

  it("shows the title once the list has it", async () => {
    const link = saved();
    const fetched = { ...link, resource: { ...link.resource, title: "Baby kangaroo", fetchStatus: "fetched" } };
    answer({ save: () => Promise.resolve(link), listed: [fetched] });
    renderShared("https://example.com/article");
    expect(await screen.findByText("Baby kangaroo")).toBeInTheDocument();
  });

  it("says when and where a duplicate was saved, and offers no Undo", async () => {
    const link = {
      ...saved({ savedAt: new Date(new Date().getFullYear(), 2, 3).toISOString(), collections: [{ id: crypto.randomUUID(), name: "Rust" }] }),
      duplicate: true,
    };
    answer({ save: () => Promise.resolve(link) });
    renderShared("https://example.com/article");
    expect(await screen.findByRole("heading", { name: "Already saved" })).toBeInTheDocument();
    expect(screen.getByText("You saved this on Mar 3 · in Rust")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Undo" })).not.toBeInTheDocument();
  });

  it("deletes a new save on Undo", async () => {
    const link = saved();
    answer({ save: () => Promise.resolve(link) });
    const user = renderShared("https://example.com/article");
    await user.click(await screen.findByRole("button", { name: "Undo" }));
    expect(await screen.findByRole("heading", { name: "Removed" })).toBeInTheDocument();
    expect(calls("DELETE", `/links/${link.id}`)).toHaveLength(1);
  });

  it("offers a paste box when nothing shared held a link, and saves what is pasted", async () => {
    answer({ save: () => Promise.resolve(saved()) });
    const user = renderShared(null);
    expect(await screen.findByRole("heading", { name: "No link found" })).toBeInTheDocument();
    expect(calls("POST", "/links")).toHaveLength(0);
    await user.type(screen.getByRole("textbox", { name: "Link" }), "example.com/pasted{Enter}");
    expect(await screen.findByRole("heading", { name: "Saved to linkables" })).toBeInTheDocument();
    expect(JSON.parse(calls("POST", "/links")[0]?.[2]?.body as string)).toMatchObject({ url: "https://example.com/pasted" });
  });

  it("shows the error with Retry, and Retry saves again", async () => {
    const link = saved();
    const save = vi.fn<(url: string) => Promise<unknown>>()
      .mockRejectedValueOnce(new ApiError("NETWORK_ERROR", "offline"))
      .mockResolvedValue(link);
    answer({ save });
    const user = renderShared("https://example.com/article");
    expect(await screen.findByRole("heading", { name: "Couldn't save" })).toBeInTheDocument();
    expect(screen.getByText("You're offline. The link wasn't saved.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("heading", { name: "Saved to linkables" })).toBeInTheDocument();
    expect(save).toHaveBeenCalledTimes(2);
  });

  it("files the saved link in a collection from the quick picks without re-sorting them", async () => {
    const link = saved();
    const rust = { id: crypto.randomUUID(), name: "Rust", pinned: false, createdAt: link.savedAt, lastUsedAt: link.savedAt, linkCount: 0, cover: [] };
    answer({ save: () => Promise.resolve(link), collections: [rust] });
    const user = renderShared("https://example.com/article");
    const pick = await screen.findByRole("button", { name: "Rust" });
    await user.click(pick);
    expect(pick).toHaveAttribute("aria-pressed", "true");
    await waitFor(() => { expect(calls("PUT", `/collections/${rust.id}/links/${link.id}`)).toHaveLength(1); });
    // A refetch would re-sort by last use and move rows under the finger.
    expect(calls("GET", "/collections")).toHaveLength(1);
  });
});
