import { useEffect, useState } from "react";

const ARMED_MS = 3500;

// The web Share dialog's rule: a link turned off can't come back, so turning it
// off asks for a second tap instead of offering Undo.
export function useTwoTap(onConfirm: () => void, pending: boolean) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => { setArmed(false); }, ARMED_MS);
    return () => { clearTimeout(timer); };
  }, [armed]);

  function press() {
    if (pending) return;
    setArmed(!armed);
    if (armed) onConfirm();
  }

  return { armed, press };
}
