import type { SaveLinkResponse } from "@linkables/shared/links";
import { describe, expect, it, vi } from "vitest";
import { ApiError, NETWORK_ERROR } from "@linkables/shared/api-client";
import { NO_SESSION } from "../api/client";
import { CANT_SAVE_REASONS } from "./savable";
import { saveCurrentTab, SAVE_MESSAGES, savedTitle } from "./save-flow";

function savedLink(overrides: Partial<SaveLinkResponse> = {}): SaveLinkResponse {
  return {
    id: "6f1c8f4e-2b7a-4c1d-9e0f-3a5b7c9d1e2f",
    originalUrl: "https://example.com/a",
    titleOverride: null,
    note: null,
    pinned: false,
    savedAt: "2026-10-24T10:00:00.000Z",
    savedFrom: "extension",
    collections: [],
    resource: {
      id: "7f1c8f4e-2b7a-4c1d-9e0f-3a5b7c9d1e2f",
      canonicalUrl: "https://example.com/a",
      title: null,
      description: null,
      author: null,
      faviconUrl: null,
      thumbnailUrl: null,
      kind: null,
      fetchStatus: "pending",
    },
    duplicate: false,
    ...overrides,
  };
}

const tab = (url?: string, title?: string) => () => Promise.resolve({ url, title });

describe("saveCurrentTab", () => {
  it("saves the tab's address, marked as saved from the extension", async () => {
    const save = vi.fn(() => Promise.resolve(savedLink()));
    await saveCurrentTab({ readTab: tab("https://example.com/a", "Example"), save });
    expect(save).toHaveBeenCalledWith({ url: "https://example.com/a", source: "extension" });
  });

  it("reports the saved link with the tab's title", async () => {
    const link = savedLink();
    const outcome = await saveCurrentTab({ readTab: tab("https://example.com/a", "Example"), save: () => Promise.resolve(link) });
    expect(outcome).toEqual({ status: "saved", link, pageTitle: "Example" });
  });

  it("does not call the API for a page that can't be saved", async () => {
    const save = vi.fn(() => Promise.resolve(savedLink()));
    const outcome = await saveCurrentTab({ readTab: tab("chrome://settings/"), save });
    expect(outcome).toEqual({ status: "cant", reason: CANT_SAVE_REASONS.browser });
    expect(save).not.toHaveBeenCalled();
  });

  it("reports offline when the API can't be reached", async () => {
    const save = () => Promise.reject(new ApiError(NETWORK_ERROR, "Could not reach linkables"));
    await expect(saveCurrentTab({ readTab: tab("https://example.com/a"), save })).resolves.toEqual({
      status: "error",
      message: SAVE_MESSAGES.offline,
    });
  });

  it("asks to try again when the sign-in could not be refreshed", async () => {
    const save = () => Promise.reject(new ApiError(NO_SESSION, "No session to send"));
    await expect(saveCurrentTab({ readTab: tab("https://example.com/a"), save })).resolves.toEqual({
      status: "error",
      message: SAVE_MESSAGES.noSession,
    });
  });

  it("reports the rate limit when saving too fast", async () => {
    const save = () => Promise.reject(new ApiError("RATE_LIMIT", "Slow down"));
    await expect(saveCurrentTab({ readTab: tab("https://example.com/a"), save })).resolves.toEqual({
      status: "error",
      message: SAVE_MESSAGES.rateLimited,
    });
  });

  it("reports an address the API refuses", async () => {
    const save = () => Promise.reject(new ApiError("VALIDATION", "Invalid request body"));
    await expect(saveCurrentTab({ readTab: tab("https://example.com/a"), save })).resolves.toEqual({
      status: "error",
      message: SAVE_MESSAGES.refused,
    });
  });

  it("reports any other API error as a failed save", async () => {
    const save = () => Promise.reject(new ApiError("INTERNAL", "Boom"));
    await expect(saveCurrentTab({ readTab: tab("https://example.com/a"), save })).resolves.toEqual({
      status: "error",
      message: SAVE_MESSAGES.failed,
    });
  });

  it("lets an error that is not from the API through", async () => {
    const save = () => Promise.reject(new RangeError("bug"));
    await expect(saveCurrentTab({ readTab: tab("https://example.com/a"), save })).rejects.toBeInstanceOf(RangeError);
  });
});

describe("savedTitle", () => {
  it("prefers the title the user gave the link", () => {
    const link = savedLink({ titleOverride: "Mine", resource: { ...savedLink().resource, title: "Fetched" } });
    expect(savedTitle(link, "Tab")).toBe("Mine");
  });

  it("uses the fetched title of a link saved before", () => {
    const link = savedLink({ resource: { ...savedLink().resource, title: "Fetched" } });
    expect(savedTitle(link, "Tab")).toBe("Fetched");
  });

  it("uses the tab's title while the page's own title is still being fetched", () => {
    expect(savedTitle(savedLink(), "Tab")).toBe("Tab");
  });

  it("falls back to the address", () => {
    expect(savedTitle(savedLink(), null)).toBe("https://example.com/a");
  });
});
