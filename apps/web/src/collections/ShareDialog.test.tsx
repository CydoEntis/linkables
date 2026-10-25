import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { testQueryClient } from "../test/render-with-router";
import { ShareDialog } from "./ShareDialog";
import { listedCollection } from "./test-collections";

const request = vi.hoisted(() => vi.fn<(path: string, schema: unknown, init?: RequestInit) => Promise<unknown>>());
vi.mock("../api/api", () => ({ api: { request } }));

const TOKEN = "Trip_Token-0123456789abcdefghijk";
const TRIP = listedCollection({ name: "Trip to Japan", linkCount: 5 });

function serve(initial: string | null) {
  let token = initial;
  request.mockImplementation((_path, _schema, init) => {
    if (init?.method === "POST") token = TOKEN;
    if (init?.method === "DELETE") token = null;
    return Promise.resolve({ token });
  });
}

function renderDialog() {
  return render(
    <QueryClientProvider client={testQueryClient()}>
      <ShareDialog collection={TRIP} open onOpenChange={() => {}} />
    </QueryClientProvider>,
  );
}

beforeEach(() => { request.mockReset(); });
afterEach(() => { Reflect.deleteProperty(navigator, "share"); });

describe("ShareDialog", () => {
  it("says only the owner can see the collection until a link is made", async () => {
    serve(null);
    renderDialog();

    expect(await screen.findByText("5 links · only you can see it")).toBeInTheDocument();
    expect(screen.getByText("Never your notes, pins or name")).toBeInTheDocument();
  });

  it("makes a share link and shows it", async () => {
    serve(null);
    const user = userEvent.setup();
    renderDialog();

    await user.click(await screen.findByRole("button", { name: "Get share link" }));

    expect(await screen.findByText("Link is on")).toBeInTheDocument();
    expect(screen.getByText(TOKEN)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See what viewers see" })).toHaveAttribute("href", `${window.location.origin}/s/${TOKEN}`);
  });

  it("sends the link through the phone's share sheet", async () => {
    serve(TOKEN);
    const share = vi.fn<typeof navigator.share>().mockResolvedValue();
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    const user = userEvent.setup();
    renderDialog();

    await user.click(await screen.findByRole("button", { name: "Send link…" }));

    expect(share).toHaveBeenCalledWith({ title: "Trip to Japan", url: `${window.location.origin}/s/${TOKEN}` });
  });

  it("copies the link when the browser can't share", async () => {
    serve(TOKEN);
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    renderDialog();

    await user.click(await screen.findByRole("button", { name: "Send link…" }));

    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/s/${TOKEN}`);
  });

  it("turns the link off on the second tap", async () => {
    serve(TOKEN);
    const user = userEvent.setup();
    renderDialog();

    await user.click(await screen.findByRole("button", { name: "Turn off link" }));
    await user.click(screen.getByRole("button", { name: "Tap again to turn off" }));

    expect(await screen.findByRole("button", { name: "Get share link" })).toBeInTheDocument();
    expect(request).toHaveBeenCalledWith(`/collections/${TRIP.id}/share`, expect.anything(), { method: "DELETE" });
  });
});
