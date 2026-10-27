import { toast } from "sonner";

// Sharing a single link is copying its address. Resolves to whether it was copied.
export async function copyLink(url: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(url);
    toast("Link copied");
    return true;
  } catch (error) {
    if (!(error instanceof DOMException)) throw error;
    toast.error("Couldn't copy the link.");
    return false;
  }
}
