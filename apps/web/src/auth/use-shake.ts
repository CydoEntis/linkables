import { useState } from "react";

// Spread fieldProps on the field; shake() plays the shake once, again on each call after it ends.
export function useShake() {
  const [shaking, setShaking] = useState(false);
  return {
    shake: () => { setShaking(true); },
    fieldProps: { "data-shaking": shaking || undefined, onAnimationEnd: () => { setShaking(false); } },
  };
}
