import { useEffect, useState } from "react";

// Seconds left until the deadline, ticking once a second; restart() starts it again.
export function useCountdown(seconds: number): { secondsLeft: number; restart: () => void } {
  const [deadline, setDeadline] = useState(() => Date.now() + seconds * 1000);
  const [now, setNow] = useState(() => Date.now());
  const secondsLeft = Math.max(0, Math.ceil((deadline - now) / 1000));
  const running = secondsLeft > 0;

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => { setNow(Date.now()); }, 1000);
    return () => { clearInterval(timer); };
  }, [running]);

  function restart() {
    const start = Date.now();
    setDeadline(start + seconds * 1000);
    setNow(start);
  }

  return { secondsLeft, restart };
}
