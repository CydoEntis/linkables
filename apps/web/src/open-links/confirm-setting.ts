import { create } from "zustand";

export const ASK_BEFORE_OPENING_KEY = "linkables.askBeforeOpeningMany";

// Opening this many tabs at once is likely to be blocked, so it asks even when the setting is off.
export const BIG_OPEN_COUNT = 25;

// Storage is a convenience: blocked or cleared site data falls back to asking.
function readAsk(): boolean {
  try {
    return localStorage.getItem(ASK_BEFORE_OPENING_KEY) !== "off";
  } catch (error) {
    if (error instanceof DOMException) return true;
    throw error;
  }
}

function storeAsk(ask: boolean): void {
  try {
    if (ask) localStorage.removeItem(ASK_BEFORE_OPENING_KEY);
    else localStorage.setItem(ASK_BEFORE_OPENING_KEY, "off");
  } catch (error) {
    if (!(error instanceof DOMException)) throw error;
  }
}

type AskBeforeOpening = { ask: boolean; setAsk: (ask: boolean) => void };

export const useAskBeforeOpening = create<AskBeforeOpening>()((set) => ({
  ask: readAsk(),
  setAsk: (ask) => {
    storeAsk(ask);
    set({ ask });
  },
}));

export function isBigOpen(count: number): boolean {
  return count > BIG_OPEN_COUNT;
}

export function needsConfirm(count: number, ask: boolean): boolean {
  return count > 1 && (ask || isBigOpen(count));
}
