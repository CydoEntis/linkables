import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { usePasteToSave } from "./use-paste-to-save";

type Request = (path: string, schema: unknown, init?: RequestInit) => Promise<unknown>;
const request = vi.hoisted(() => vi.fn<Request>());
vi.mock("../api/api", () => ({ api: { request } }));

function Page() {
  usePasteToSave();
  return <input aria-label="Some field" />;
}

function paste(target: Element, text: string) {
  const event = new Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "clipboardData", { value: { getData: () => text } });
  fireEvent(target, event);
}

beforeEach(() => {
  request.mockReset();
  request.mockReturnValue(new Promise(() => undefined));
  render(
    <QueryClientProvider client={new QueryClient()}>
      <Page />
    </QueryClientProvider>,
  );
});

it("saves a link pasted outside any field", async () => {
  paste(document.body, "https://example.com/pasted");
  await vi.waitFor(() => {
    expect(request).toHaveBeenCalledWith(
      "/links",
      expect.anything(),
      expect.objectContaining({ body: JSON.stringify({ url: "https://example.com/pasted" }) }),
    );
  });
});

it("leaves pastes into a field and pasted text alone", async () => {
  paste(screen.getByRole("textbox", { name: "Some field" }), "https://example.com/pasted");
  paste(document.body, "just some words");
  // Saving starts after an awaited cancelQueries, so give it a turn before checking.
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(request).not.toHaveBeenCalled();
});
