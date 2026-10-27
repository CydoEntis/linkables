import type { ShareScopeRequest, ShareState } from "@linkables/shared/sharing";
import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Toaster } from "@/components/ui/sonner";
import { testQueryClient } from "../test/render-with-router";
import { ShareControls } from "./ShareControls";
import { listedCollection } from "./test-collections";

const request = vi.hoisted(() => vi.fn<(path: string, schema: unknown, init?: RequestInit) => Promise<unknown>>());
vi.mock("../api/api", () => ({ api: { request } }));

const TOKEN = "Trip_Token-0123456789abcdefghijk";
const TRIP = listedCollection({ name: "Trip", linkCount: 5 });
const FOOD = { id: crypto.randomUUID(), name: "Food", shared: true };
const HOTELS = { id: crypto.randomUUID(), name: "Hotels", shared: true };
const SIGHTS = { id: crypto.randomUUID(), name: "Sights", shared: false };

// The share route over memory: a save changes what the next read answers, as the server would.
function serve(initial: ShareState, { saveFails = false }: { saveFails?: boolean } = {}) {
  let state = initial;
  const puts: ShareScopeRequest[] = [];
  request.mockImplementation((path, _schema, init) => {
    if (path === "/collections/shared") return Promise.resolve({ items: [{ id: TRIP.id, name: TRIP.name, token: TOKEN }] });
    if (init?.method === "PUT") {
      const scope = JSON.parse(init.body as string) as ShareScopeRequest;
      puts.push(scope);
      if (saveFails) return Promise.reject(new Error("down"));
      state = { ...state, ungrouped: scope.ungrouped, groups: state.groups?.map((group) => ({ ...group, shared: scope.groupIds.includes(group.id) })) };
    }
    return Promise.resolve(state);
  });
  return puts;
}

async function openMenu() {
  const user = userEvent.setup();
  render(
    <QueryClientProvider client={testQueryClient()}>
      <ShareControls collection={TRIP} wide />
      <Toaster />
    </QueryClientProvider>,
  );
  await user.click(await screen.findByRole("button", { name: "Sharing options" }));
  return user;
}

beforeEach(() => { request.mockReset(); });
afterEach(() => { toast.dismiss(); });

describe("the What's shared checklist", () => {
  it("is not there for a collection without groups", async () => {
    serve({ token: TOKEN });
    await openMenu();

    expect(await screen.findByRole("menuitem", { name: "Copy link" })).toBeInTheDocument();
    expect(screen.queryByText("What's shared")).not.toBeInTheDocument();
  });

  it("lists the ungrouped links and each group with how many groups are shared", async () => {
    serve({ token: TOKEN, ungrouped: true, groups: [FOOD, HOTELS, SIGHTS] });
    await openMenu();

    expect(await screen.findByText("What's shared")).toBeInTheDocument();
    expect(screen.getByRole("menuitemcheckbox", { name: "Ungrouped links" })).toBeChecked();
    expect(screen.getByRole("menuitemcheckbox", { name: "Food" })).toBeChecked();
    expect(screen.getByRole("menuitemcheckbox", { name: "Sights" })).not.toBeChecked();
    expect(screen.getByText("2 of 3 groups shared")).toBeInTheDocument();
  });

  it("saves at once when a group is unticked, sending exactly the groups still shared", async () => {
    const puts = serve({ token: TOKEN, ungrouped: true, groups: [FOOD, HOTELS, SIGHTS] });
    const user = await openMenu();

    await user.click(await screen.findByRole("menuitemcheckbox", { name: "Hotels" }));

    expect(puts).toEqual([{ ungrouped: true, groupIds: [FOOD.id] }]);
    expect(screen.getByRole("menuitemcheckbox", { name: "Hotels" })).not.toBeChecked();
    expect(screen.getByText("1 of 3 groups shared")).toBeInTheDocument();
  });

  it("treats the ungrouped links as their own tick", async () => {
    const puts = serve({ token: TOKEN, ungrouped: true, groups: [FOOD] });
    const user = await openMenu();

    await user.click(await screen.findByRole("menuitemcheckbox", { name: "Ungrouped links" }));

    expect(puts).toEqual([{ ungrouped: false, groupIds: [FOOD.id] }]);
  });

  it("puts the tick back and says so when the save fails", async () => {
    serve({ token: TOKEN, ungrouped: true, groups: [FOOD] }, { saveFails: true });
    const user = await openMenu();

    await user.click(await screen.findByRole("menuitemcheckbox", { name: "Food" }));

    expect(await screen.findByText("Couldn't change what's shared. Try again.")).toBeInTheDocument();
    await waitFor(() => { expect(screen.getByRole("menuitemcheckbox", { name: "Food" })).toBeChecked(); });
  });

  it("keeps the menu open so several ticks can be changed in a row", async () => {
    const puts = serve({ token: TOKEN, ungrouped: true, groups: [FOOD, HOTELS] });
    const user = await openMenu();

    await user.click(await screen.findByRole("menuitemcheckbox", { name: "Food" }));
    await user.click(screen.getByRole("menuitemcheckbox", { name: "Hotels" }));

    expect(puts).toEqual([
      { ungrouped: true, groupIds: [HOTELS.id] },
      { ungrouped: true, groupIds: [] },
    ]);
  });
});
