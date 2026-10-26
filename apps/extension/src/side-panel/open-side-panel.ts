import { env } from "../config/env";

// The only module that calls chrome.sidePanel, so Firefox's sidebar_action can stand in for it.

// Named in manifest.ts; Chrome has no built-in command for the side panel.
export const OPEN_SIDE_PANEL_COMMAND = "open-side-panel";

export function canOpenSidePanel(): boolean {
  return chrome.sidePanel !== undefined;
}

// Chrome opens the panel only inside a user gesture, so call this from the click
// or command itself, before any await.
export function openSidePanel(windowId: number): Promise<void> {
  if (!chrome.sidePanel) return Promise.reject(new Error("This browser has no side panel"));
  return chrome.sidePanel.open({ windowId });
}

function openApp(): Promise<unknown> {
  return chrome.tabs.create({ url: env.VITE_APP_URL });
}

// The side panel where the browser has one and opens it, else the web app in a new tab.
// Same gesture rule as openSidePanel.
export function openSidePanelOrApp(windowId: number | undefined): Promise<unknown> {
  if (windowId === undefined || !canOpenSidePanel()) return openApp();
  return openSidePanel(windowId).catch(openApp);
}
