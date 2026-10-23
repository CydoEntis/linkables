import { useSyncExternalStore } from "react";

// beforeinstallprompt is Chromium-only and missing from TypeScript's DOM types.
type InstallPromptEvent = Event & { prompt: () => Promise<unknown> };

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function setDeferred(event: InstallPromptEvent | null) {
  deferred = event;
  for (const listener of listeners) listener();
}

// Chrome fires the event once, soon after load, so it is caught when this module
// loads rather than when the page that offers Install mounts.
window.addEventListener("beforeinstallprompt", (event) => { setDeferred(event as InstallPromptEvent); });
window.addEventListener("appinstalled", () => { setDeferred(null); });

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => { listeners.delete(onChange); };
}

// The browser's own install dialog, or null where the browser offers none.
export function useInstallPrompt(): (() => void) | null {
  const event = useSyncExternalStore(subscribe, () => deferred);
  if (!event) return null;
  // A prompt can be shown only once; the ⋮ menu steps stay for a second try.
  return () => { void event.prompt().finally(() => { setDeferred(null); }); };
}
