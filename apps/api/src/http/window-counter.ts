type Window = { startedAt: number; count: number };

export type WindowCounterOptions = { limit: number; windowMs: number; maxKeys: number; now: () => number };

// full: refused only because the map holds maxKeys open windows, not for this key's own count.
export type Hit = { ok: true } | { ok: false; retryAfterMs: number; full: boolean };

// Fixed windows per key, held in process memory. A key that starts a new window
// is moved to the end, so the map stays ordered by start time and ended windows
// are always at the front: dropping them on each new key is cheap.
// When the map is full of open windows, a new key is limited rather than
// evicting the oldest, so rotating keys can neither grow memory nor flush an
// existing key's count; it clears as soon as the oldest window ends.
export function windowCounter({ limit, windowMs, maxKeys, now }: WindowCounterOptions) {
  const windows = new Map<string, Window>();

  function dropEnded(at: number) {
    for (const [key, window] of windows) {
      if (at - window.startedAt < windowMs) return;
      windows.delete(key);
    }
  }

  function untilEnd(window: Window, at: number): number {
    return window.startedAt + windowMs - at;
  }

  function hit(key: string): Hit {
    const at = now();
    const current = windows.get(key);
    if (current !== undefined && at - current.startedAt < windowMs) {
      if (current.count >= limit) return { ok: false, retryAfterMs: untilEnd(current, at), full: false };
      current.count += 1;
      return { ok: true };
    }
    windows.delete(key);
    dropEnded(at);
    const oldest = windows.values().next().value;
    if (oldest !== undefined && windows.size >= maxKeys) return { ok: false, retryAfterMs: untilEnd(oldest, at), full: true };
    windows.set(key, { startedAt: at, count: 1 });
    return { ok: true };
  }

  return { hit, size: () => windows.size };
}
