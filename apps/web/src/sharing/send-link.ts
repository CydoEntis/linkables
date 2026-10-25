import { copyLink } from "../links/share-link";

export function canSend(): boolean {
  return typeof navigator.share === "function";
}

// Phones send through the system share sheet; a browser without one, or a share
// that fails for any reason but the person cancelling, copies instead.
export async function sendLink(url: string, title: string): Promise<void> {
  if (!canSend()) {
    await copyLink(url);
    return;
  }
  try {
    await navigator.share({ title, url });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return;
    await copyLink(url);
  }
}
