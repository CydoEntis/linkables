import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Toaster } from "@/components/ui/sonner";
import { savedLink } from "../links/test-links";
import { CollectionPicker } from "./CollectionPicker";
import { listedCollection } from "./test-collections";

const request = vi.hoisted(() => vi.fn<(path: string, schema: unknown, init?: RequestInit) => Promise<unknown>>());
vi.mock("../api/api", () => ({ api: { request } }));

const rust = listedCollection({ name: "rust" });
const recipes = listedCollection({ name: "Recipes" });
// Toasts outlive a test, so the Undo test files into a collection no other test touches.
const later = listedCollection({ name: "watch later" });

function renderPicker(link = savedLink(), variant: "popover" | "sheet" = "popover") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <CollectionPicker link={link} variant={variant} />
      <Toaster />
    </QueryClientProvider>,
  );
  return { link, user: userEvent.setup() };
}

function calls(method: string) {
  return request.mock.calls.filter(([, , init]) => init?.method === method).map(([path]) => path);
}

beforeEach(() => {
  request.mockReset();
  const items = [rust, recipes, later];
  request.mockImplementation((path, _schema, init) => {
    if (path === "/collections" && init?.method === "POST") {
      const { name } = JSON.parse(init.body as string) as { name: string };
      const created = listedCollection({ name });
      items.unshift(created);
      return Promise.resolve(created);
    }
    if (path === "/collections") return Promise.resolve({ items: [...items] });
    return Promise.resolve(null);
  });
});

describe("CollectionPicker", () => {
  it("lists collections with display names and ticks the ones the link is in", async () => {
    renderPicker(savedLink({ collections: [{ id: recipes.id, name: recipes.name }] }));
    expect(await screen.findByRole("button", { name: "Rust" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Recipes" })).toHaveAttribute("aria-pressed", "true");
  });

  it("ticks at once and files the link with PUT, then unticks with DELETE", async () => {
    const { link, user } = renderPicker();
    const row = await screen.findByRole("button", { name: "Rust" });
    const path = `/collections/${rust.id}/links/${link.id}`;
    await user.click(row);
    expect(row).toHaveAttribute("aria-pressed", "true");
    await waitFor(() => { expect(calls("PUT")).toEqual([path]); });
    await user.click(row);
    expect(row).toHaveAttribute("aria-pressed", "false");
    await waitFor(() => { expect(calls("DELETE")).toEqual([path]); });
  });

  it("sends a quick tick and untick in order, waiting for the first to finish", async () => {
    let finishPut = () => {};
    request.mockImplementation((path, _schema, init) => {
      if (path === "/collections") return Promise.resolve({ items: [rust, recipes, later] });
      if (init?.method === "PUT") return new Promise((resolve) => { finishPut = () => { resolve(null); }; });
      return Promise.resolve(null);
    });
    const { user } = renderPicker();
    const row = await screen.findByRole("button", { name: "Rust" });
    await user.click(row);
    await user.click(row);
    await waitFor(() => { expect(calls("PUT")).toHaveLength(1); });
    expect(calls("DELETE")).toHaveLength(0);
    finishPut();
    await waitFor(() => { expect(calls("DELETE")).toHaveLength(1); });
  });

  it("offers Undo after filing, which takes the link back out", async () => {
    const { link, user } = renderPicker();
    await user.click(await screen.findByRole("button", { name: "Watch later" }));
    const toast = await screen.findByText("Added to Watch later");
    // fireEvent: sonner captures the pointer on press, which jsdom lacks.
    fireEvent.click(within(toast.closest("li") ?? document.body).getByRole("button", { name: "Undo" }));
    await waitFor(() => { expect(calls("DELETE")).toEqual([`/collections/${later.id}/links/${link.id}`]); });
  });

  it("finds by name and offers to create one that does not exist", async () => {
    const { link, user } = renderPicker();
    const field = screen.getByRole("textbox", { name: "Find or create a collection" });
    await screen.findByRole("button", { name: "Rust" });
    await user.type(field, "rec");
    expect(screen.queryByRole("button", { name: "Rust" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Recipes" })).toBeInTheDocument();
    await user.type(field, "ipes to try");
    await user.click(screen.getByRole("button", { name: "+ Create “recipes to try”" }));
    expect(calls("POST")).toEqual(["/collections"]);
    await waitFor(() => { expect(calls("PUT")).toEqual([expect.stringMatching(new RegExp(`/links/${link.id}$`))]); });
  });

  it("does not offer to create a name that exists in another case", async () => {
    const { user } = renderPicker();
    await screen.findByRole("button", { name: "Rust" });
    await user.type(screen.getByRole("textbox", { name: "Find or create a collection" }), "RUST");
    expect(screen.queryByRole("button", { name: /Create/ })).not.toBeInTheDocument();
  });

  it("keeps its order while ticking, though the API moves a ticked collection to the top", async () => {
    const { user } = renderPicker();
    await user.click(await screen.findByRole("button", { name: "Recipes" }));
    const names = within(screen.getByRole("list", { name: "Collections" }))
      .getAllByRole("button")
      .map((button) => button.textContent);
    expect(names).toEqual(["Rust", "Recipes", "Watch later"]);
  });

  it("creates and ticks a new collection from the sheet's New collection form", async () => {
    const { user } = renderPicker(savedLink(), "sheet");
    await screen.findByRole("button", { name: "Rust" });
    await user.click(screen.getByRole("button", { name: "New collection" }));
    await user.type(screen.getByRole("textbox", { name: "New collection name" }), "Japan{Enter}");
    expect(await screen.findByRole("button", { name: "Japan" })).toHaveAttribute("aria-pressed", "true");
    await waitFor(() => { expect(calls("PUT")).toHaveLength(1); });
  });
});
