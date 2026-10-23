import { useRef, useState, type MouseEvent, type PointerEvent } from "react";

// The handoff: 60 px opens it, and it stops at the tiles with no overswipe.
export const SWIPE_OPEN_AT = 60;
const SLOP = 8;

export function clampOffset(offset: number, width: number): number {
  return Math.min(0, Math.max(-width, offset));
}

// Where a released swipe settles: past 60 px from where it started, it flips.
export function settlesOpen(startedOpen: boolean, offset: number, width: number): boolean {
  return startedOpen ? offset < -(width - SWIPE_OPEN_AT) : offset < -SWIPE_OPEN_AT;
}

type SwipeOptions = { width: number; open: boolean; onOpenChange: (open: boolean) => void };

// Touch and pen only: a mouse drags the row onto a collection instead.
export function useSwipe({ width, open, onOpenChange }: SwipeOptions) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const [dragOffset, setDragOffset] = useState<number | null>(null);
  const base = open ? -width : 0;

  function onPointerDown(event: PointerEvent<HTMLElement>) {
    if (event.pointerType === "mouse") return;
    start.current = { x: event.clientX, y: event.clientY };
    swiped.current = false;
  }

  function onPointerMove(event: PointerEvent<HTMLElement>) {
    if (start.current === null) return;
    const dx = event.clientX - start.current.x;
    const dy = event.clientY - start.current.y;
    if (dragOffset === null) {
      if (Math.abs(dy) > SLOP && Math.abs(dy) > Math.abs(dx)) start.current = null;
      if (Math.abs(dx) < SLOP || Math.abs(dx) < Math.abs(dy)) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      swiped.current = true;
    }
    setDragOffset(clampOffset(base + dx, width));
  }

  function onPointerUp() {
    if (dragOffset !== null) onOpenChange(settlesOpen(open, dragOffset, width));
    setDragOffset(null);
    start.current = null;
  }

  // A swipe must not also open the link, and a tap on an open row only closes it.
  function onClickCapture(event: MouseEvent<HTMLElement>) {
    if (!swiped.current && !open) return;
    event.preventDefault();
    event.stopPropagation();
    if (!swiped.current) onOpenChange(false);
    swiped.current = false;
  }

  return {
    offset: dragOffset ?? base,
    dragging: dragOffset !== null,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onClickCapture },
  };
}
