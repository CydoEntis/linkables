import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Toaster } from "@/components/ui/sonner";
import { DropToSave } from "./DropToSave";
import { droppedUrl } from "./use-drop-to-save";

const request = vi.hoisted(() => vi.fn<(path: string, schema: unknown, init?: RequestInit) => Promise<unknown>>());
vi.mock("../api/api", () => ({ api: { request } }));

type Data = Record<string, string>;

function transfer(data: Data) {
  return { types: Object.keys(data), getData: (type: string) => data[type] ?? "", dropEffect: "none" };
}

// jsdom has no DragEvent or DataTransfer, so a plain event carries a stand-in.
function fire(type: string, data: Data, target: EventTarget = window) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "dataTransfer", { value: transfer(data) });
  act(() => { target.dispatchEvent(event); });
  return event;
}

function renderDropZone() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <DropToSave />
      <Toaster />
    </QueryClientProvider>,
  );
}

function savedUrls() {
  return request.mock.calls
    .filter(([path, , init]) => path === "/links" && init?.method === "POST")
    .map(([, , init]) => (JSON.parse(init?.body as string) as { url: string }).url);
}

beforeEach(() => {
  request.mockReset();
  request.mockReturnValue(new Promise(() => undefined));
});

describe("DropToSave", () => {
  it("shows Drop to save while a link is dragged over the window, and saves it on drop", async () => {
    renderDropZone();
    const link = { "text/uri-list": "https://example.com/dropped" };
    fire("dragenter", link);
    expect(screen.getByText("Drop to save")).toBeInTheDocument();
    expect(fire("dragover", link).defaultPrevented).toBe(true);

    fire("drop", link);

    expect(screen.queryByText("Drop to save")).toBeNull();
    await vi.waitFor(() => { expect(savedUrls()).toEqual(["https://example.com/dropped"]); });
  });

  it("hides the overlay once the link is dragged back out of the window", () => {
    renderDropZone();
    const link = { "text/plain": "https://example.com/x" };
    fire("dragenter", link);
    fire("dragenter", link);
    fire("dragleave", link);
    expect(screen.getByText("Drop to save")).toBeInTheDocument();
    fire("dragleave", link);
    expect(screen.queryByText("Drop to save")).toBeNull();
  });

  it("ignores a drag that started inside the app, such as a row on its way to a collection", () => {
    renderDropZone();
    const row = { "text/uri-list": "https://example.com/row", "application/x-linkables-link": "row-id" };
    fire("dragstart", row, document.body);
    fire("dragenter", row);
    expect(screen.queryByText("Drop to save")).toBeNull();
    expect(fire("dragover", row).defaultPrevented).toBe(false);

    fire("dragend", row, document.body);
    fire("dragenter", { "text/uri-list": "https://example.com/outside" });
    expect(screen.getByText("Drop to save")).toBeInTheDocument();
  });

  it("ignores dragged files", () => {
    renderDropZone();
    fire("dragenter", { Files: "" });
    expect(screen.queryByText("Drop to save")).toBeNull();
  });

  it("says so when the dropped text holds no link", async () => {
    renderDropZone();
    fire("dragenter", { "text/plain": "just words" });
    fire("drop", { "text/plain": "just words" });
    expect(await screen.findByText("There was no link in what you dropped.")).toBeInTheDocument();
    expect(savedUrls()).toEqual([]);
  });
});

describe("droppedUrl", () => {
  const data = (values: Data) => ({ getData: (type: string) => values[type] ?? "" });

  it("takes the first URL of a uri-list, skipping comments", () => {
    expect(droppedUrl(data({ "text/uri-list": "# from a browser\r\nhttps://a.test/1\r\nhttps://a.test/2" }))).toBe("https://a.test/1");
  });

  it("finds an http(s) link inside plain text", () => {
    expect(droppedUrl(data({ "text/plain": "read https://b.test/post later" }))).toBe("https://b.test/post");
  });

  it("returns null for anything but an http(s) link", () => {
    expect(droppedUrl(data({ "text/uri-list": "javascript:alert(1)", "text/plain": "no link" }))).toBeNull();
  });
});
