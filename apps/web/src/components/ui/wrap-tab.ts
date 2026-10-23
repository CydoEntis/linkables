import type { KeyboardEvent } from "react";

const TABBABLE = "a[href], button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]";

function tabbables(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(TABBABLE)].filter(
    (element) => element.tabIndex >= 0 && !element.hasAttribute("data-base-ui-focus-guard") && element.checkVisibility(),
  );
}

// Base UI wraps Tab through focus guards that refocus on the next animation
// frame, so a second Tab inside that frame walks out of the modal. Wrapping
// here, before the guard is reached, keeps focus in the popup at any speed.
// Keys bubbling up from a portalled popover never match an edge, so the
// popover keeps its own Tab order.
export function wrapTab(event: KeyboardEvent<HTMLElement>) {
  if (event.key !== "Tab") return;
  const items = tabbables(event.currentTarget);
  const first = items[0];
  const last = items.at(-1);
  if (first === undefined || last === undefined) return;
  const active = document.activeElement;
  const atEdge = event.shiftKey ? active === first || active === event.currentTarget : active === last;
  if (!atEdge) return;
  event.preventDefault();
  (event.shiftKey ? last : first).focus();
}
