import { saveSource, type SaveSource } from "./save-source";

// Share → linkables only exists where the installed app is a share target:
// Android today. iPhone gets its own setup later, so it is not promised yet.
export function shareTip(source: SaveSource, installed: boolean): string | null {
  if (source === "android") {
    return installed
      ? "Faster: in any app, tap Share, then linkables."
      : "Faster: add linkables to your home screen, then in any app tap Share → linkables.";
  }
  if (source === "iphone" || source === "ipad") return "Saving from Share on iPhone is coming soon.";
  return null;
}

export function deviceShareTip(): string | null {
  return shareTip(saveSource(navigator), window.matchMedia("(display-mode: standalone)").matches);
}
