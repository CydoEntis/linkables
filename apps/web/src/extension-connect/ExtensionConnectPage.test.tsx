import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { keepPendingConnect, pendingReturnHref } from "../save/pending-save";
import { ExtensionConnectPage, NO_EXTENSION_MS } from "./ExtensionConnectPage";

const NONCE = "0123456789abcdef0123456789abcdef";

function fromExtension(data: unknown) {
  act(() => { window.dispatchEvent(new MessageEvent("message", { data, origin: window.location.origin, source: window })); });
}

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => {
  vi.useRealTimers();
  sessionStorage.clear();
});

it("says it is connecting while the extension answers", () => {
  render(<ExtensionConnectPage />);
  fromExtension({ type: "linkables:extension-hello", nonce: NONCE });
  act(() => { vi.advanceTimersByTime(NO_EXTENSION_MS); });

  expect(screen.getByRole("heading", { name: "Connecting the extension…" })).toBeInTheDocument();
});

it("says the extension is signed in once it connects", () => {
  render(<ExtensionConnectPage />);

  fromExtension({ type: "linkables:extension-connected", ok: true });

  expect(screen.getByRole("heading", { name: "The extension is signed in" })).toBeInTheDocument();
  expect(screen.getByText("You can close this tab.")).toBeInTheDocument();
});

it("says so when the extension could not sign in", () => {
  render(<ExtensionConnectPage />);

  fromExtension({ type: "linkables:extension-connected", ok: false });

  expect(screen.getByRole("heading", { name: "Couldn't sign in the extension" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
});

it("points to the install guide when no extension answers", () => {
  render(<ExtensionConnectPage />);

  act(() => { vi.advanceTimersByTime(NO_EXTENSION_MS); });

  expect(screen.getByRole("heading", { name: "The extension didn't answer" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Get the extension" })).toHaveAttribute("href", "/extension");
});

it("forgets the visit it was brought back for, so a later sign-in goes home", () => {
  keepPendingConnect();

  render(<ExtensionConnectPage />);

  expect(pendingReturnHref()).toBeNull();
});
