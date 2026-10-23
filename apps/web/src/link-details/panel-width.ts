export const PANEL_WIDTH = { min: 360, max: 900, default: 480 } as const;

const KEY_STEP = 16;
// The list keeps at least this much of the window beside the panel.
const LIST_MIN = 300;
const STORAGE_KEY = "linkables.detailsWidth";

export function maxPanelWidth(viewportWidth: number): number {
  return Math.max(PANEL_WIDTH.min, Math.min(PANEL_WIDTH.max, viewportWidth - LIST_MIN));
}

export function clampWidth(width: number, maxWidth: number = PANEL_WIDTH.max): number {
  return Math.min(maxWidth, Math.max(PANEL_WIDTH.min, Math.round(width)));
}

// The grip sits on the panel's left edge, so moving it left widens the panel.
export function widthAfterKey(width: number, key: string, maxWidth: number = PANEL_WIDTH.max): number | null {
  if (key === "ArrowLeft") return clampWidth(width + KEY_STEP, maxWidth);
  if (key === "ArrowRight") return clampWidth(width - KEY_STEP, maxWidth);
  if (key === "Home") return PANEL_WIDTH.min;
  if (key === "End") return maxWidth;
  return null;
}

// Storage is a convenience: a private window or blocked site data starts at the default.
export function readStoredWidth(): number {
  try {
    const stored = Number(localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(stored) && stored > 0 ? clampWidth(stored) : PANEL_WIDTH.default;
  } catch (error) {
    if (error instanceof DOMException) return PANEL_WIDTH.default;
    throw error;
  }
}

export function storeWidth(width: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(width));
  } catch (error) {
    if (!(error instanceof DOMException)) throw error;
  }
}
