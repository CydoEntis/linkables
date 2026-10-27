import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flashSaveResult } from "./saved-badge";

// The toolbar button's badge and title for each tab, as Chrome keeps them.
function fakeAction() {
  const badges = new Map<number, string>();
  const titles = new Map<number, string>();
  const action = {
    getBadgeText: ({ tabId }: { tabId: number }) => Promise.resolve(badges.get(tabId) ?? ""),
    setBadgeText: ({ tabId, text }: { tabId: number; text: string }) => Promise.resolve(void badges.set(tabId, text)),
    getTitle: ({ tabId }: { tabId: number }) => Promise.resolve(titles.get(tabId) ?? "Save to linkables"),
    setTitle: ({ tabId, title }: { tabId: number; title: string }) => Promise.resolve(void titles.set(tabId, title)),
    setBadgeBackgroundColor: () => Promise.resolve(),
    setBadgeTextColor: () => Promise.resolve(),
  };
  return { action, badges, titles };
}

describe("flashSaveResult", () => {
  let fake: ReturnType<typeof fakeAction>;

  beforeEach(() => {
    vi.useFakeTimers();
    fake = fakeAction();
    vi.stubGlobal("chrome", { action: fake.action });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("shows the result and its hint, then the tab's own badge and title again", async () => {
    fake.badges.set(7, "✓");
    await flashSaveResult(7, false, "Sign in first");
    expect([fake.badges.get(7), fake.titles.get(7)]).toEqual(["!", "Sign in first"]);

    await vi.runAllTimersAsync();
    expect([fake.badges.get(7), fake.titles.get(7)]).toEqual(["✓", "Save to linkables"]);
  });

  it("restores the tab's own badge and title after flashes that overlap", async () => {
    await flashSaveResult(7, true, "Link saved to linkables");
    await flashSaveResult(7, false, "Sign in first");
    expect([fake.badges.get(7), fake.titles.get(7)]).toEqual(["!", "Sign in first"]);

    await vi.runAllTimersAsync();
    expect([fake.badges.get(7), fake.titles.get(7)]).toEqual(["", "Save to linkables"]);
  });
});
