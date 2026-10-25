import { useEffect, useState } from "react";

const ARMED_MS = 3500;

export const TURN_OFF_HINT = "The link stops working right away. Turning it on later makes a new one.";

// A link that is turned off can't come back, so turning it off asks for a
// second tap instead of offering Undo. The first tap arms it for 3.5 s.
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

  return { armed, press, reset: () => { setArmed(false); } };
}
