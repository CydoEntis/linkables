import { saveSource, type SaveSource } from "../links/save-source";

// The three ways to save without copy and paste: Share on Android, the Shortcut
// on iPhone and iPad, the bookmark button and drag and drop on a computer.
export type SaveDevice = "android" | "iphone" | "desktop";

export const SAVE_DEVICES: readonly SaveDevice[] = ["android", "iphone", "desktop"];

export function saveDevice(source: SaveSource): SaveDevice {
  if (source === "android") return "android";
  if (source === "iphone" || source === "ipad") return "iphone";
  return "desktop";
}

export function currentSaveDevice(): SaveDevice {
  return saveDevice(saveSource(navigator));
}
