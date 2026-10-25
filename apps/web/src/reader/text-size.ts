export const TEXT_SIZES = [0, 1, 2] as const;
export type TextSize = (typeof TEXT_SIZES)[number];
export const DEFAULT_TEXT_SIZE: TextSize = 1;

const STORAGE_KEY = "linkables.readerTextSize";

function isTextSize(value: number): value is TextSize {
  return (TEXT_SIZES as readonly number[]).includes(value);
}

// Kept per device on purpose: the size that reads well on a phone is not the
// one that reads well on a desktop. Storage is a convenience, so a private
// window or blocked site data starts at the default.
export function readTextSize(): TextSize {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const stored = raw === null || raw === "" ? NaN : Number(raw);
    return isTextSize(stored) ? stored : DEFAULT_TEXT_SIZE;
  } catch (error) {
    if (error instanceof DOMException) return DEFAULT_TEXT_SIZE;
    throw error;
  }
}

export function storeTextSize(size: TextSize): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(size));
  } catch (error) {
    if (!(error instanceof DOMException)) throw error;
  }
}
