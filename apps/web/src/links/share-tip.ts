import { saveSource, type SaveSource } from "./save-source";

// Share → linkables exists where the installed app is a share target (Android);
// iPhone shares through the Save to linkables Shortcut, set up on Save from anywhere.
export function shareTip(source: SaveSource, installed: boolean): string | null {
  if (source === "android") {
    return installed
      ? "Faster: in any app, tap Share, then linkables."
      : "Faster: add linkables to your home screen, then in any app tap Share → linkables.";
  }
  if (source === "iphone" || source === "ipad") return "Faster: add the Save to linkables shortcut, then in any app tap Share → Save to linkables.";
  return null;
}

export function deviceShareTip(): string | null {
  return shareTip(saveSource(navigator), window.matchMedia("(display-mode: standalone)").matches);
}
