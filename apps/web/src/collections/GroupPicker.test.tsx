import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Toaster } from "@/components/ui/sonner";
import { GroupPicker } from "./GroupPicker";
import { fakeGroupServer, filedLink, group } from "./test-groups";

const request = vi.hoisted(() => vi.fn<(path: string, schema: unknown, init?: RequestInit) => Promise<unknown>>());
vi.mock("../api/api", () => ({ api: { request } }));

const collectionId = crypto.randomUUID();
const [reading, tools] = [group("Reading", 0), group("Tools", 1)];

function setup() {
  const entry = filedLink("Moving link", collectionId, null);
  const filed = [entry];
  const server = fakeGroupServer(collectionId, [reading, tools], filed);
  request.mockImplementation(server.request);
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <GroupPicker link={entry.link} collectionId={collectionId} size="popover" />
      <Toaster />
    </QueryClientProvider>,
  );
  return { ...server, user: userEvent.setup() };
}

const patches = (calls: { method: string; body: unknown }[]) => calls.filter((call) => call.method === "PATCH").map((call) => call.body);

beforeEach(() => {
  request.mockReset();
});

describe("GroupPicker", () => {
  it("starts on Ungrouped and lists the groups", async () => {
    setup();
    expect(await screen.findByRole("button", { name: "Reading" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Ungrouped" })).toHaveAttribute("aria-pressed", "true");
  });

  it("moves the link to the chosen group and offers Undo", async () => {
    const { user, calls } = setup();
    await user.click(await screen.findByRole("button", { name: "Reading" }));
    expect(screen.getByRole("button", { name: "Reading" })).toHaveAttribute("aria-pressed", "true");
    expect(await screen.findByText("Moved to Reading")).toBeInTheDocument();
    expect(patches(calls)).toEqual([{ groupId: reading.id }]);

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    await vi.waitFor(() => { expect(patches(calls)).toEqual([{ groupId: reading.id }, { groupId: null }]); });
    expect(screen.getByRole("button", { name: "Ungrouped" })).toHaveAttribute("aria-pressed", "true");
  });

  it("moves a link back to Ungrouped", async () => {
    const { user, calls } = setup();
    await user.click(await screen.findByRole("button", { name: "Tools" }));
    await user.click(screen.getByRole("button", { name: "Ungrouped" }));
    await vi.waitFor(() => { expect(patches(calls)).toEqual([{ groupId: tools.id }, { groupId: null }]); });
  });
});
