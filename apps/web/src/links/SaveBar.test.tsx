import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Toaster } from "@/components/ui/sonner";
import { ApiError } from "@linkables/shared/api-client";
import { TestRouter } from "../test/router";
import { LinkList } from "./LinkList";
import { SaveBar } from "./SaveBar";
import { SaveStatus } from "./SaveStatus";
import { savedLink } from "./test-links";

type Request = (path: string, schema: unknown, init?: RequestInit) => Promise<unknown>;
const request = vi.hoisted(() => vi.fn<Request>());
vi.mock("../api/api", () => ({ api: { request } }));

const listResponse = { items: [] as unknown[], cursor: null };

function answerSave(answer: (body: { url: string }) => Promise<unknown>) {
  request.mockImplementation((path, _schema, init) => {
    if (path === "/links" && init?.method === "POST") return answer(JSON.parse(init.body as string) as { url: string });
    return Promise.resolve(listResponse);
  });
}

function savedBody(): unknown {
  const call = request.mock.calls.find(([path, , init]) => path === "/links" && init?.method === "POST");
  return JSON.parse(call?.[2]?.body as string);
}

function renderBar(query?: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onQueryChange = vi.fn<(query: string | undefined) => void>();
  render(
    <QueryClientProvider client={queryClient}>
      <SaveBar query={query} onQueryChange={onQueryChange} />
      <SaveStatus />
      <TestRouter>
        <LinkList scope={{ view: "all" }} />
      </TestRouter>
      <Toaster />
    </QueryClientProvider>,
  );
  return { field: screen.getByRole("textbox", { name: "Search or paste a link" }), user: userEvent.setup(), onQueryChange };
}

beforeEach(() => {
  request.mockReset();
  listResponse.items = [];
});

describe("SaveBar", () => {
  it("is focused when the page loads", () => {
    answerSave(() => new Promise(() => undefined));
    const { field } = renderBar();
    expect(field).toHaveFocus();
  });

  it("shows a pending row at once when Enter saves a link, and clears the field", async () => {
    answerSave(() => new Promise(() => undefined));
    const { field, user } = renderBar();
    await screen.findByRole("heading", { name: /Save your first link/ });
    await user.type(field, "https://example.com/new{Enter}");
    expect(await screen.findByText("example.com/new")).toBeInTheDocument();
    expect(screen.getByText(/Getting details…/)).toBeInTheDocument();
    expect(field).toHaveValue("");
    expect(screen.getByText("Saving the link…", { selector: "p[role=status]" })).toBeInTheDocument();
    expect(request).toHaveBeenCalledWith("/links", expect.anything(), expect.objectContaining({ method: "POST" }));
  });

  it("offers the Save link button only for a valid link", async () => {
    answerSave(() => new Promise(() => undefined));
    const { field, user } = renderBar();
    await user.type(field, "rust");
    expect(screen.queryByRole("button", { name: "Save link" })).not.toBeInTheDocument();
    await user.type(field, ".org");
    await user.click(screen.getByRole("button", { name: "Save link" }));
    expect(savedBody()).toEqual({ url: "https://rust.org", source: expect.any(String) as unknown });
  });

  it("searches for text that is not a link once typing pauses", async () => {
    answerSave(() => Promise.resolve(null));
    const { field, user, onQueryChange } = renderBar();
    await user.type(field, "tokyo walk");
    expect(onQueryChange).not.toHaveBeenCalled();
    await waitFor(() => { expect(onQueryChange).toHaveBeenCalledWith("tokyo walk"); });
    expect(onQueryChange).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("searches at once on Enter and never saves a non-link", async () => {
    answerSave(() => Promise.resolve(null));
    const { field, user, onQueryChange } = renderBar();
    await user.type(field, "not a link{Enter}");
    expect(onQueryChange).toHaveBeenCalledWith("not a link");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(request).not.toHaveBeenCalledWith("/links", expect.anything(), expect.objectContaining({ method: "POST" }));
  });

  it("never searches for a link", async () => {
    answerSave(() => new Promise(() => undefined));
    const { field, user, onQueryChange } = renderBar();
    await user.type(field, "rust.org");
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(onQueryChange).not.toHaveBeenCalled();
  });

  it("keeps a link-like search from the URL as a search", async () => {
    answerSave(() => new Promise(() => undefined));
    const { field, onQueryChange } = renderBar("node.js");
    expect(field).toHaveValue("node.js");
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(onQueryChange).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Save link" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear search" })).toBeInTheDocument();
  });

  it("searches the first 200 characters of a longer search and says so", async () => {
    answerSave(() => new Promise(() => undefined));
    const { field, user, onQueryChange } = renderBar();
    await user.click(field);
    await user.paste(`${"word ".repeat(40)}extra`);
    expect(screen.getByText("Searches use the first 200 characters.")).toBeInTheDocument();
    await waitFor(() => { expect(onQueryChange).toHaveBeenCalledWith("word ".repeat(40).trim()); });
  });

  it("shows the search from the URL and clears it with the Clear button", async () => {
    answerSave(() => Promise.resolve(null));
    const { field, user, onQueryChange } = renderBar("rust");
    expect(field).toHaveValue("rust");
    await user.click(screen.getByRole("button", { name: "Clear search" }));
    expect(field).toHaveValue("");
    expect(field).toHaveFocus();
    expect(onQueryChange).toHaveBeenCalledWith(undefined);
  });

  it("clears the search on Esc, then leaves the bar on a second Esc", async () => {
    answerSave(() => Promise.resolve(null));
    const { field, user, onQueryChange } = renderBar("rust");
    await user.type(field, "{Escape}");
    expect(field).toHaveValue("");
    expect(onQueryChange).toHaveBeenCalledWith(undefined);
    await user.type(field, "{Escape}");
    expect(field).not.toHaveFocus();
  });

  it("says Already saved for a duplicate and adds no second row", async () => {
    const existing = savedLink({ originalUrl: "https://example.com/old", resource: { title: "Old favourite" } });
    listResponse.items = [existing];
    answerSave(() => Promise.resolve({ ...existing, duplicate: true }));
    const { field, user } = renderBar();
    await screen.findByText("Old favourite");
    await user.type(field, "https://example.com/old{Enter}");
    expect(await screen.findByText("Already saved", { selector: "[data-sonner-toast] *" })).toBeInTheDocument();
    expect(screen.getByText("Already saved", { selector: "p[role=status]" })).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("puts a link the API rejects back in the bar with the reason", async () => {
    answerSave(() => Promise.reject(new ApiError("VALIDATION", "url must be at most 2048 bytes once normalised")));
    const { field, user } = renderBar();
    await user.type(field, "https://example.com/x{Enter}");
    expect(await screen.findByRole("alert")).toHaveTextContent("Links must start with http:// or https://");
    expect(field).toHaveValue("https://example.com/x");
    expect(screen.queryByText("example.com/x")).not.toBeInTheDocument();
  });

  it("toasts a rate limit and removes the pending row", async () => {
    answerSave(() => Promise.reject(new ApiError("RATE_LIMIT", "Too many saves, try again shortly")));
    const { field, user } = renderBar();
    await screen.findByRole("heading", { name: /Save your first link/ });
    await user.type(field, "https://example.com/y{Enter}");
    expect(await screen.findByText("Too many saves. Wait a minute.")).toBeInTheDocument();
    expect(screen.queryByText("example.com/y")).not.toBeInTheDocument();
  });
});
