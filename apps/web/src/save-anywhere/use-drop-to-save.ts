import { useEffect, useEffectEvent, useState } from "react";
import { extractSharedUrl } from "../save/shared-url";

const LINK_TYPES = ["text/uri-list", "text/plain"];

// While a drag is over the page, dragover repeats at least every 350 ± 200 ms
// (HTML drag-and-drop processing model). Silence for longer means the drag left
// without a dragleave the count could see, such as one fired on a removed element.
const DRAG_GONE_MS = 800;

type Handlers = Record<string, (event: Event) => void>;

// text/uri-list is one URL per line, with # comment lines.
export function droppedUrl(data: Pick<DataTransfer, "getData">): string | null {
  const firstUri = data.getData("text/uri-list").split(/\r?\n/).find((line) => line !== "" && !line.startsWith("#"));
  return extractSharedUrl({ url: firstUri, text: data.getData("text/plain") });
}

// Drags that start inside the app (a row on its way to a collection, the bookmark
// button on its way to the bookmarks bar) fire dragstart here first and are left
// alone. Their dragend may never arrive (the row can unmount mid-drag), so the
// latch also clears on any drop and on the first pointer event after the drag:
// browsers send no pointer events while a drag is in progress.
function linkDragHandlers(setDragging: (dragging: boolean) => void, onDrop: (url: string | null) => void): Handlers {
  let depth = 0;
  let internal = false;
  let goneTimer: ReturnType<typeof setTimeout> | undefined;

  const reset = () => {
    depth = 0;
    internal = false;
    clearTimeout(goneTimer);
    setDragging(false);
  };
  const show = () => {
    clearTimeout(goneTimer);
    goneTimer = setTimeout(reset, DRAG_GONE_MS);
    setDragging(true);
  };
  const linkData = (event: Event): DataTransfer | null => {
    const data = (event as DragEvent).dataTransfer;
    return !internal && data && LINK_TYPES.some((type) => data.types.includes(type)) ? data : null;
  };

  return {
    dragstart: () => { internal = true; },
    dragend: reset,
    pointerdown: reset,
    pointermove: reset,
    keydown: (event) => { if ((event as KeyboardEvent).key === "Escape") reset(); },
    dragenter: (event) => {
      if (!linkData(event)) return;
      depth += 1;
      show();
    },
    // Only a cancelled dragover lets the window take the drop.
    dragover: (event) => {
      const data = linkData(event);
      if (!data) return;
      event.preventDefault();
      data.dropEffect = "copy";
      show();
    },
    dragleave: (event) => {
      if (!linkData(event)) return;
      depth -= 1;
      if (depth <= 0) reset();
    },
    drop: (event) => {
      const data = linkData(event);
      reset();
      if (!data) return;
      event.preventDefault();
      onDrop(droppedUrl(data));
    },
  };
}

// True while a link from outside the app is dragged over the window.
export function useDropToSave(onDrop: (url: string | null) => void): boolean {
  const [dragging, setDragging] = useState(false);
  const drop = useEffectEvent(onDrop);

  useEffect(() => {
    const handlers = Object.entries(linkDragHandlers(setDragging, drop));
    // Capture, so a drop target inside the app that stops propagation still clears the latch.
    for (const [type, handler] of handlers) window.addEventListener(type, handler, true);
    return () => {
      for (const [type, handler] of handlers) window.removeEventListener(type, handler, true);
    };
  }, []);

  return dragging;
}
