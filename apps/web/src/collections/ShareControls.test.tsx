import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
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
const TRIP = listedCollection({ name: "Trip to Japan", linkCount: 5 });
const URL = `${window.location.origin}/s/${TOKEN}`;

function serve(initial: string | null, { turnOn = "works" }: { turnOn?: "works" | "fails" | "hangs" } = {}) {
  let token = initial;
  request.mockImplementation((path, _schema, init) => {
    if (init?.method === "POST") {
      if (turnOn === "fails") return Promise.reject(new Error("down"));
      if (turnOn === "hangs") return new Promise(() => {});
      token = TOKEN;
    }
    if (init?.method === "DELETE") token = null;
    if (path === "/collections/shared") return Promise.resolve({ items: token === null ? [] : [{ id: TRIP.id, name: TRIP.name, token }] });
    return Promise.resolve({ token });
  });
}

function renderControls({ wide = true } = {}) {
  return render(
    <QueryClientProvider client={testQueryClient()}>
      <ShareControls collection={TRIP} wide={wide} />
      <Toaster />
    </QueryClientProvider>,
  );
}

beforeEach(() => { request.mockReset(); });
afterEach(() => {
  // Sonner replays toasts that are still showing to the next test's Toaster.
  toast.dismiss();
  Reflect.deleteProperty(navigator, "share");
  Reflect.deleteProperty(globalThis, "ClipboardItem");
});

describe("ShareControls with the link off", () => {
  it("makes the link and copies it in one click", async () => {
    serve(null);
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    renderControls();

    await user.click(screen.getByRole("button", { name: "Share" }));

    expect(await screen.findByText("Link copied · anyone with it can view")).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith(URL);
    expect(await screen.findByRole("button", { name: "Copy link" })).toBeInTheDocument();
  });

  it("starts the copy inside the click where the browser takes a promised clipboard item", async () => {
    serve(null);
    const user = userEvent.setup();
    const ClipboardItem = vi.fn<(item: Record<string, Promise<Blob>>) => void>();
    Object.defineProperty(globalThis, "ClipboardItem", { value: ClipboardItem, configurable: true });
    const write = vi.spyOn(navigator.clipboard, "write").mockResolvedValue();
    renderControls();

    await user.click(screen.getByRole("button", { name: "Share" }));

    expect(write).toHaveBeenCalledOnce();
    expect(await ClipboardItem.mock.calls[0]?.[0]["text/plain"]?.then((blob) => blob.text())).toBe(URL);
    expect(await screen.findByText("Link copied · anyone with it can view")).toBeInTheDocument();
  });

  it("says the link is on, without claiming it was copied, when the clipboard refuses", async () => {
    serve(null);
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new DOMException("denied", "NotAllowedError"));
    renderControls();

    await user.click(screen.getByRole("button", { name: "Share" }));

    expect(await screen.findByText("Link is on")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
    expect(screen.queryByText(/Link copied/)).not.toBeInTheDocument();
  });

  it("says so when the link can't be made", async () => {
    serve(null, { turnOn: "fails" });
    const user = userEvent.setup();
    renderControls();

    await user.click(screen.getByRole("button", { name: "Share" }));

    expect(await screen.findByText("Couldn't make the link. Try again.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Share" })).toBeInTheDocument();
  });

  it("ignores more clicks while the link is being made", async () => {
    serve(null, { turnOn: "hangs" });
    const user = userEvent.setup();
    renderControls();
    const share = screen.getByRole("button", { name: "Share" });

    await user.click(share);
    await user.click(share);

    expect(share).toHaveAttribute("aria-busy", "true");
    expect(request.mock.calls.filter(([, , init]) => init?.method === "POST")).toHaveLength(1);
  });
});

describe("ShareControls with the link on", () => {
  it("copies the link in one click", async () => {
    serve(TOKEN);
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    renderControls();

    await user.click(await screen.findByRole("button", { name: "Copy link" }));

    expect(writeText).toHaveBeenCalledWith(URL);
    expect(await screen.findByText("Link copied")).toBeInTheDocument();
  });

  it("shows the link and opens the shared page in a new tab from the menu", async () => {
    serve(TOKEN);
    const user = userEvent.setup();
    renderControls();

    await user.click(await screen.findByRole("button", { name: "Sharing options" }));

    expect(await screen.findByText(TOKEN)).toBeInTheDocument();
    const open = screen.getByRole("menuitem", { name: "Open shared page" });
    expect(open).toHaveAttribute("href", URL);
    expect(open).toHaveAttribute("target", "_blank");
    expect(open).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.queryByRole("menuitem", { name: "Send…" })).not.toBeInTheDocument();
  });

  it("turns the link off on the second tap, keeping the menu open after the first", async () => {
    serve(TOKEN);
    const user = userEvent.setup();
    renderControls();
    await user.click(await screen.findByRole("button", { name: "Sharing options" }));

    await user.click(await screen.findByRole("menuitem", { name: "Turn off link" }));

    expect(screen.getByText(/stops working right away/)).toBeInTheDocument();
    expect(request).not.toHaveBeenCalledWith(`/collections/${TRIP.id}/share`, expect.anything(), { method: "DELETE" });
    await user.click(screen.getByRole("menuitem", { name: "Tap again to turn off" }));

    expect(await screen.findByText("Link turned off. It no longer works.")).toBeInTheDocument();
    expect(request).toHaveBeenCalledWith(`/collections/${TRIP.id}/share`, expect.anything(), { method: "DELETE" });
    expect(await screen.findByRole("button", { name: "Share" })).toHaveFocus();
  });

  it("sends the link through the phone's share sheet", async () => {
    serve(TOKEN);
    const share = vi.fn<typeof navigator.share>().mockResolvedValue();
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    const user = userEvent.setup();
    renderControls({ wide: false });

    await user.click(await screen.findByRole("button", { name: "Send link…" }));

    expect(share).toHaveBeenCalledWith({ title: "Trip to Japan", url: URL });
  });

  it("copies on a phone whose browser can't share", async () => {
    serve(TOKEN);
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    renderControls({ wide: false });

    await user.click(await screen.findByRole("button", { name: "Copy link" }));

    expect(writeText).toHaveBeenCalledWith(URL);
  });
});
