import { useEffect, useEffectEvent, useState } from "react";
import { extractSharedUrl } from "../save/shared-url";

const LINK_TYPES = ["text/uri-list", "text/plain"];

// text/uri-list is one URL per line, with # comment lines.
export function droppedUrl(data: Pick<DataTransfer, "getData">): string | null {
  const firstUri = data.getData("text/uri-list").split(/\r?\n/).find((line) => line !== "" && !line.startsWith("#"));
  return extractSharedUrl({ url: firstUri, text: data.getData("text/plain") });
}

// True while a link from outside the app is dragged over the window. Drags that
// start inside the app (a row on its way to a collection, the bookmark button on
// its way to the bookmarks bar) fire dragstart here first and are left alone.
export function useDropToSave(onDrop: (url: string | null) => void): boolean {
  const [dragging, setDragging] = useState(false);
  const drop = useEffectEvent(onDrop);

  useEffect(() => {
    let depth = 0;
    let internal = false;
    const accepts = (event: DragEvent) =>
      !internal && LINK_TYPES.some((type) => event.dataTransfer?.types.includes(type) === true);
    const reset = () => {
      depth = 0;
      setDragging(false);
    };

    const handlers: Record<string, (event: DragEvent) => void> = {
      dragstart: () => { internal = true; },
      dragend: () => {
        internal = false;
        reset();
      },
      dragenter: (event) => {
        if (!accepts(event)) return;
        depth += 1;
        setDragging(true);
      },
      // Only a cancelled dragover lets the window take the drop.
      dragover: (event) => {
        if (!accepts(event) || !event.dataTransfer) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      },
      dragleave: (event) => {
        if (!accepts(event)) return;
        depth -= 1;
        if (depth <= 0) reset();
      },
      drop: (event) => {
        if (!accepts(event) || !event.dataTransfer) return;
        event.preventDefault();
        reset();
        drop(droppedUrl(event.dataTransfer));
      },
    };

    for (const [type, handler] of Object.entries(handlers)) window.addEventListener(type, handler as EventListener);
    return () => {
      for (const [type, handler] of Object.entries(handlers)) window.removeEventListener(type, handler as EventListener);
    };
  }, []);

  return dragging;
}
