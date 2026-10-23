import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Toaster } from "@/components/ui/sonner";
import { ApiError } from "../api/client";
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

function renderBar() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <SaveBar />
      <SaveStatus />
      <LinkList view="all" />
      <Toaster />
    </QueryClientProvider>,
  );
  return { field: screen.getByRole("textbox", { name: "Search or paste a link" }), user: userEvent.setup() };
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
    await screen.findByText("No links yet");
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
    expect(request).toHaveBeenCalledWith("/links", expect.anything(), expect.objectContaining({ body: JSON.stringify({ url: "https://rust.org" }) }));
  });

  it("explains a non-link under the bar without calling the API", async () => {
    answerSave(() => Promise.resolve(null));
    const { field, user } = renderBar();
    await user.type(field, "not a link{Enter}");
    expect(screen.getByRole("alert")).toHaveTextContent("Links must start with http:// or https://");
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(request).not.toHaveBeenCalledWith("/links", expect.anything(), expect.objectContaining({ method: "POST" }));
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
    await screen.findByText("No links yet");
    await user.type(field, "https://example.com/y{Enter}");
    expect(await screen.findByText("Too many saves. Wait a minute.")).toBeInTheDocument();
    expect(screen.queryByText("example.com/y")).not.toBeInTheDocument();
  });
});
