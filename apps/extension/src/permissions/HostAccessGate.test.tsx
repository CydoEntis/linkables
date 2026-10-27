import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { HostAccessGate } from "./HostAccessGate";
import { HOST_ACCESS } from "./host-access";

const contains = vi.fn<(permissions: unknown) => Promise<boolean>>();
const request = vi.fn<(permissions: unknown) => Promise<boolean>>(() => Promise.resolve(true));
const listener = { addListener: vi.fn(), removeListener: vi.fn() };

const permissions = { contains, request, onAdded: listener, onRemoved: listener };

beforeEach(() => {
  vi.stubGlobal("chrome", { permissions, sidebarAction: {} });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it("shows the pop-up when linkables.app may be reached", async () => {
  contains.mockResolvedValue(true);
  render(<HostAccessGate>the pop-up</HostAccessGate>);
  expect(await screen.findByText("the pop-up")).toBeInTheDocument();
  expect(contains).toHaveBeenCalledWith(HOST_ACCESS);
});

it("asks for access from a button when the browser has it switched off", async () => {
  contains.mockResolvedValue(false);
  render(<HostAccessGate>the pop-up</HostAccessGate>);
  await userEvent.click(await screen.findByRole("button", { name: "Allow access to linkables.app" }));
  expect(request).toHaveBeenCalledWith(HOST_ACCESS);
  expect(screen.queryByText("the pop-up")).not.toBeInTheDocument();
});

it("shows the pop-up in Chrome even when site access is withheld", async () => {
  vi.stubGlobal("chrome", { permissions, sidePanel: {} });
  contains.mockResolvedValue(false);
  render(<HostAccessGate>the pop-up</HostAccessGate>);
  expect(await screen.findByText("the pop-up")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Allow access to linkables.app" })).not.toBeInTheDocument();
});

it("shows the pop-up once access is granted", async () => {
  contains.mockResolvedValueOnce(false).mockResolvedValue(true);
  render(<HostAccessGate>the pop-up</HostAccessGate>);
  await userEvent.click(await screen.findByRole("button", { name: "Allow access to linkables.app" }));
  const [onAdded] = listener.addListener.mock.calls[0] as [() => void];
  onAdded();
  expect(await screen.findByText("the pop-up")).toBeInTheDocument();
});

it("says so when the browser refuses the request", async () => {
  contains.mockResolvedValue(false);
  request.mockRejectedValueOnce(new Error("denied"));
  render(<HostAccessGate>the pop-up</HostAccessGate>);
  await userEvent.click(await screen.findByRole("button", { name: "Allow access to linkables.app" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't ask");
});

it("says so when the user declines the request", async () => {
  contains.mockResolvedValue(false);
  request.mockResolvedValueOnce(false);
  render(<HostAccessGate>the pop-up</HostAccessGate>);
  await userEvent.click(await screen.findByRole("button", { name: "Allow access to linkables.app" }));
  expect(await screen.findByRole("alert")).toBeInTheDocument();
});
