import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { HostAccessGate } from "./HostAccessGate";
import { HOST_ACCESS } from "./host-access";

const contains = vi.fn<(permissions: unknown) => Promise<boolean>>();
const request = vi.fn<(permissions: unknown) => Promise<boolean>>(() => Promise.resolve(true));
const listener = { addListener: vi.fn(), removeListener: vi.fn() };

beforeEach(() => {
  vi.stubGlobal("chrome", { permissions: { contains, request, onAdded: listener, onRemoved: listener } });
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
