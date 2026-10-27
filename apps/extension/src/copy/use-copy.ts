import { useEffect, useState } from "react";

// The handoff's "Copied ✓" stays up for 1.8 s.
const SHOWN_MS = 1800;

export type CopyState = "idle" | "copied" | "failed";

export function useCopy() {
  const [state, setState] = useState<CopyState>("idle");

  useEffect(() => {
    if (state === "idle") return;
    const timer = setTimeout(() => { setState("idle"); }, SHOWN_MS);
    return () => { clearTimeout(timer); };
  }, [state]);

  async function copy(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch (error) {
      // The browser refuses a write while the page is not focused.
      if (!(error instanceof DOMException)) throw error;
      setState("failed");
    }
  }

  return { state, copy };
}
