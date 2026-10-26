import { EXTENSION_CONNECT_PATH } from "@linkables/shared/extension-sessions";

// sessionStorage, not localStorage: a share the user walked away from must not
// save itself days later in another tab. The tab that sent the sign-in email
// still finishes the save, because supabase-js tells every tab about the session.
// The same slot remembers a signed-out visit to /extension/connect, the only
// other page a sign-in returns to.
const KEY = "linkables:pending-save";

export const SAVE_PATH = "/save";

function storage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch (error) {
    // Some browsers throw on access when site storage is blocked.
    if (error instanceof DOMException) return null;
    throw error;
  }
}

export function keepPendingSave(searchStr: string): void {
  storage()?.setItem(KEY, searchStr);
}

export function keepPendingConnect(): void {
  storage()?.setItem(KEY, EXTENSION_CONNECT_PATH);
}

// Always a /save href, whatever was stored, so this can never redirect elsewhere.
export function pendingSaveHref(): string | null {
  const searchStr = storage()?.getItem(KEY);
  return searchStr?.startsWith("?") ? SAVE_PATH + searchStr : null;
}

// Where a sign-in returns to: a pending save or /extension/connect, nothing else.
export function pendingReturnHref(): string | null {
  if (storage()?.getItem(KEY) === EXTENSION_CONNECT_PATH) return EXTENSION_CONNECT_PATH;
  return pendingSaveHref();
}

export function clearPendingSave(): void {
  storage()?.removeItem(KEY);
}
