import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { cn } from "cn";
import { clampWidth, PANEL_WIDTH, widthAfterKey } from "./panel-width";

type ResizeGripProps = { width: number; onResize: (width: number) => void; onResizeEnd: (width: number) => void };

// The APG window-splitter pattern: a focusable separator that arrow keys move.
export function ResizeGrip({ width, onResize, onResizeEnd }: ResizeGripProps) {
  const drag = useRef<{ x: number; width: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, width };
    setDragging(true);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (drag.current === null) return;
    onResize(clampWidth(drag.current.width + drag.current.x - event.clientX));
  }

  function onPointerUp() {
    if (drag.current === null) return;
    drag.current = null;
    setDragging(false);
    onResizeEnd(width);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const next = widthAfterKey(width, event.key);
    if (next === null) return;
    event.preventDefault();
    onResize(next);
    onResizeEnd(next);
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize link details"
      aria-valuenow={width}
      aria-valuemin={PANEL_WIDTH.min}
      aria-valuemax={PANEL_WIDTH.max}
      tabIndex={0}
      title="Drag to resize"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
      className="group/grip absolute inset-y-0 -left-[5px] z-10 flex w-2.5 cursor-col-resize touch-none items-center justify-center focus-visible:outline-offset-0"
    >
      <span
        aria-hidden
        className={cn(
          "h-11 w-1 rounded-xs transition-colors group-hover/grip:bg-foreground",
          dragging ? "bg-primary group-hover/grip:bg-primary" : "bg-subtle-foreground",
        )}
      />
    </div>
  );
}
