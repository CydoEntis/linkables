// sessionStorage, not localStorage: a share the user walked away from must not
// save itself days later in another tab. The tab that sent the sign-in email
// still finishes the save, because supabase-js tells every tab about the session.
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

// Always a /save href, whatever was stored, so this can never redirect elsewhere.
export function pendingSaveHref(): string | null {
  const searchStr = storage()?.getItem(KEY);
  return searchStr?.startsWith("?") ? SAVE_PATH + searchStr : null;
}

export function clearPendingSave(): void {
  storage()?.removeItem(KEY);
}
