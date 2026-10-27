import { expect, test } from "./fixtures";

// Playwright can't open Chrome's own right-click menu or press an extension
// shortcut, so this checks the worker the menu and the shortcut run in starts
// and listens; saveFromMenu's unit tests cover what a click does.
test("the background worker starts and listens for the right-click menu and the shortcut", async ({ context }) => {
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
  const listening = await worker.evaluate(() => {
    type Listened = { hasListeners(): boolean };
    const { chrome } = globalThis as unknown as { chrome: { contextMenus: { onClicked: Listened }; commands: { onCommand: Listened } } };
    return { menu: chrome.contextMenus.onClicked.hasListeners(), command: chrome.commands.onCommand.hasListeners() };
  });
  expect(listening).toEqual({ menu: true, command: true });
});

test("Alt+Shift+S is the quiet save and Alt+Shift+L stays the side panel's", async ({ context }) => {
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
  const shortcuts = await worker.evaluate(async () => {
    const { chrome } = globalThis as unknown as { chrome: { commands: { getAll(): Promise<{ name?: string; shortcut?: string }[]> } } };
    return (await chrome.commands.getAll()).map((command) => [command.name, command.shortcut]);
  });
  expect(shortcuts).toEqual(expect.arrayContaining([["save-quietly", "Alt+Shift+S"], ["open-side-panel", "Alt+Shift+L"]]));
});
