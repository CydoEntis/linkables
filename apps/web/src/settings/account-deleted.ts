// Set only by a delete that went through, so /account-deleted can't be opened on its own.
const DELETED_KEY = "linkables-account-deleted";

export function markAccountDeleted(): void {
  try {
    sessionStorage.setItem(DELETED_KEY, "1");
  } catch (error) {
    if (!(error instanceof DOMException)) throw error;
  }
}

export function wasAccountDeleted(): boolean {
  try {
    return sessionStorage.getItem(DELETED_KEY) === "1";
  } catch (error) {
    if (!(error instanceof DOMException)) throw error;
    return false;
  }
}

export function forgetAccountDeleted(): void {
  try {
    sessionStorage.removeItem(DELETED_KEY);
  } catch (error) {
    if (!(error instanceof DOMException)) throw error;
  }
}
