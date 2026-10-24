import { useState } from "react";

// Spread fieldProps on the field; shake() plays the shake once, again on each call after it ends.
// Skipped under reduced motion: the flag clears on animationend, which a 0 s animation may never fire.
export function useShake() {
  const [shaking, setShaking] = useState(false);
  return {
    shake: () => {
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) setShaking(true);
    },
    fieldProps: { "data-shaking": shaking || undefined, onAnimationEnd: () => { setShaking(false); } },
  };
}
