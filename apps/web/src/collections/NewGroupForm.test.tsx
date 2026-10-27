import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { COLLECTION_GROUPS_MAX } from "@linkables/shared/groups";
import { useCollectionsUi } from "./collections-ui-store";
import { NewGroupForm } from "./NewGroupForm";
import { fakeGroupServer, group } from "./test-groups";

const request = vi.hoisted(() => vi.fn<(path: string, schema: unknown, init?: RequestInit) => Promise<unknown>>());
vi.mock("../api/api", () => ({ api: { request } }));

const collectionId = crypto.randomUUID();

function setup(existing = [group("Reading", 0)], groupCount = existing.length) {
  const server = fakeGroupServer(collectionId, existing, []);
  request.mockImplementation(server.request);
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <NewGroupForm collectionId={collectionId} groupCount={groupCount} />
    </QueryClientProvider>,
  );
  return { ...server, user: userEvent.setup(), field: screen.getByRole("textbox", { name: "New group name" }) };
}

beforeEach(() => {
  request.mockReset();
  useCollectionsUi.setState({ creatingGroupIn: collectionId });
});

describe("NewGroupForm", () => {
  it("creates the group on Enter and closes the field", async () => {
    const { user, field, calls } = setup();
    await user.type(field, "  Tools {Enter}");
    await vi.waitFor(() => { expect(useCollectionsUi.getState().creatingGroupIn).toBeNull(); });
    expect(calls.find((call) => call.method === "POST")?.body).toEqual({ name: "Tools" });
  });

  it("cancels on Escape without creating", async () => {
    const { user, field, calls } = setup();
    await user.type(field, "Tools{Escape}");
    expect(useCollectionsUi.getState().creatingGroupIn).toBeNull();
    expect(calls.some((call) => call.method === "POST")).toBe(false);
  });

  it("asks for a name when the field is empty", async () => {
    const { user, field } = setup();
    await user.type(field, "   {Enter}");
    expect(await screen.findByRole("alert")).toHaveTextContent("Give it a name");
  });

  it("says a taken name is taken and keeps the field open", async () => {
    const { user, field } = setup();
    await user.type(field, "reading{Enter}");
    expect(await screen.findByRole("alert")).toHaveTextContent("You already have a group with that name");
    expect(useCollectionsUi.getState().creatingGroupIn).toBe(collectionId);
  });

  it("says a collection can have up to 20 groups, without asking the API", async () => {
    const { user, field, calls } = setup([], COLLECTION_GROUPS_MAX);
    await user.type(field, "One more{Enter}");
    expect(await screen.findByRole("alert")).toHaveTextContent("A collection can have up to 20 groups");
    expect(calls.some((call) => call.method === "POST")).toBe(false);
  });
});
