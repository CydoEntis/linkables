import { env } from "../config/env";

// The only module that calls chrome.sidePanel or Firefox's sidebarAction.

// Named in manifest.ts. Chrome has no built-in command for the side panel, so the
// worker opens it; Firefox's built-in command for the sidebar is _execute_sidebar_action.
export function isFirefox(): boolean {
  return chrome.sidebarAction !== undefined;
}

export function openSidePanelCommand(): string {
  return isFirefox() ? "_execute_sidebar_action" : "open-side-panel";
}

export function canOpenSidePanel(): boolean {
  return chrome.sidePanel !== undefined || chrome.sidebarAction !== undefined;
}

// Both browsers open the panel only inside a user gesture, so call this from the
// click or command itself, before any await.
export function openSidePanel(windowId: number): Promise<void> {
  if (chrome.sidebarAction) return chrome.sidebarAction.open();
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
