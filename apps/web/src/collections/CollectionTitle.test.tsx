import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@linkables/shared/api-client";
import { CollectionTitle } from "./CollectionTitle";
import { listedCollection } from "./test-collections";

const request = vi.hoisted(() => vi.fn<(path: string, schema: unknown, init?: RequestInit) => Promise<unknown>>());
vi.mock("../api/api", () => ({ api: { request } }));

const trip = listedCollection({ name: "trip to japan" });
const rust = listedCollection({ name: "Rust" });

function renderTitle() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <CollectionTitle collection={trip} />
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

async function startRenaming(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /^Trip to japan/ }));
  const field = screen.getByRole("textbox", { name: "Collection name" });
  await user.clear(field);
  return field;
}

function patches() {
  return request.mock.calls.filter(([, , init]) => init?.method === "PATCH");
}

beforeEach(() => {
  request.mockReset();
  request.mockImplementation((path, _schema, init) => {
    if (init?.method === "PATCH") {
      const { name } = JSON.parse(init.body as string) as { name: string };
      if (name.toLowerCase() === "rust") return Promise.reject(new ApiError("CONFLICT", "taken"));
      return Promise.resolve({ ...trip, name });
    }
    if (path === "/collections") return Promise.resolve({ items: [trip, rust] });
    return Promise.resolve({ items: [], cursor: null });
  });
});

describe("CollectionTitle", () => {
  it("shows the name with a capital first letter", () => {
    renderTitle();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/^Trip to japan/);
  });

  it("renames on Enter", async () => {
    const user = renderTitle();
    await user.type(await startRenaming(user), "Japan 2027{Enter}");
    await waitFor(() => { expect(patches()).toHaveLength(1); });
    expect(patches()[0]?.[0]).toBe(`/collections/${trip.id}`);
    expect(patches()[0]?.[2]?.body).toBe(JSON.stringify({ name: "Japan 2027" }));
  });

  it("will not save an empty name", async () => {
    const user = renderTitle();
    await user.type(await startRenaming(user), "{Enter}");
    expect(await screen.findByRole("alert")).toHaveTextContent("Give it a name");
    expect(patches()).toHaveLength(0);
  });

  it("says which collection already has the name", async () => {
    const user = renderTitle();
    await user.type(await startRenaming(user), "RUST{Enter}");
    expect(await screen.findByRole("alert")).toHaveTextContent("You already have Rust");
    expect(screen.getByRole("textbox", { name: "Collection name" })).toHaveValue("RUST");
  });

  it("puts the name back on Esc", async () => {
    const user = renderTitle();
    await user.type(await startRenaming(user), "Something else{Escape}");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/^Trip to japan/);
    expect(patches()).toHaveLength(0);
  });
});
