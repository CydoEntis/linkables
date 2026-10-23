import { toast } from "sonner";

// Sharing a single link is copying its address; collection sharing comes later.
export async function copyLink(url: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(url);
    toast("Link copied");
  } catch (error) {
    if (!(error instanceof DOMException)) throw error;
    toast.error("Couldn't copy the link.");
  }
}
