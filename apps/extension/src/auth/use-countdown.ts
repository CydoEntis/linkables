import { useEffect, useState } from "react";

// Seconds left of a countdown that began at startedAt, ticking once a second; restart() starts it again.
export function useCountdown(seconds: number, startedAt: number): { secondsLeft: number; restart: () => void } {
  const [deadline, setDeadline] = useState(() => startedAt + seconds * 1000);
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
