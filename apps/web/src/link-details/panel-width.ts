export const PANEL_WIDTH = { min: 360, max: 900, default: 480 } as const;

const KEY_STEP = 16;
const STORAGE_KEY = "linkables.detailsWidth";

export function clampWidth(width: number): number {
  return Math.min(PANEL_WIDTH.max, Math.max(PANEL_WIDTH.min, Math.round(width)));
}

// The grip sits on the panel's left edge, so moving it left widens the panel.
export function widthAfterKey(width: number, key: string): number | null {
  if (key === "ArrowLeft") return clampWidth(width + KEY_STEP);
  if (key === "ArrowRight") return clampWidth(width - KEY_STEP);
  if (key === "Home") return PANEL_WIDTH.min;
  if (key === "End") return PANEL_WIDTH.max;
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
