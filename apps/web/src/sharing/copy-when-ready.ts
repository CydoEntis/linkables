import { toast } from "sonner";

// Safari forgets the click once an await has passed, so the clipboard write
// starts inside the click, holding a promise of the text, where ClipboardItem allows it.
function startWrite(text: Promise<string>): Promise<boolean> {
  if (typeof ClipboardItem === "undefined" || !("clipboard" in navigator)) return Promise.resolve(false);
  const blob = text.then((value) => new Blob([value], { type: "text/plain" }));
  // The caller reports a failed link; this handler only stops a second, unheard rejection.
  blob.catch(() => undefined);
  // A failed write is not the end: writeText gets a second try below.
  try {
    return navigator.clipboard.write([new ClipboardItem({ "text/plain": blob })]).then(
      () => true,
      () => false,
    );
  } catch (error) {
    // Some browsers have ClipboardItem but refuse a promise inside it.
    if (!(error instanceof TypeError || error instanceof DOMException)) throw error;
    return Promise.resolve(false);
  }
}

async function writeText(text: string): Promise<boolean> {
  if (!("clipboard" in navigator)) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    if (!(error instanceof DOMException)) throw error;
    return false;
  }
}

// Copies a link that is still being made. Call it synchronously in the click
// handler. Rejects only if the link itself could not be made; resolves to whether it was copied.
export async function copyWhenReady(url: Promise<string>): Promise<boolean> {
  const early = startWrite(url);
  const text = await url;
  const copied = (await early) || (await writeText(text));
  if (copied) toast("Link copied");
  return copied;
}
