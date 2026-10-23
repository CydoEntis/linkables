import { env } from "../config/env";
import { saveSource, type SaveSource } from "./save-source";

// Share → linkables exists where the installed app is a share target (Android).
// iPhone shares through the Save to linkables Shortcut, promised only once the
// owner has shared it (VITE_IOS_SHORTCUT_URL).
export function shareTip(source: SaveSource, installed: boolean, hasShortcut: boolean): string | null {
  if (source === "android") {
    return installed
      ? "Faster: in any app, tap Share, then linkables."
      : "Faster: add linkables to your home screen, then in any app tap Share → linkables.";
  }
  if (source === "iphone" || source === "ipad") {
    return hasShortcut
      ? "Faster: add the Save to linkables shortcut, then in any app tap Share → Save to linkables."
      : "Saving from Share on iPhone is coming soon.";
  }
  return null;
}

export function deviceShareTip(): string | null {
  const installed = window.matchMedia("(display-mode: standalone)").matches;
  return shareTip(saveSource(navigator), installed, env.VITE_IOS_SHORTCUT_URL !== undefined);
}
