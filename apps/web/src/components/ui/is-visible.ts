// Safari before 17.4 (inside Vite's default browser targets) has no
// checkVisibility; an element with no boxes is not rendered either.
export function isVisible(element: Element): boolean {
  if (!("checkVisibility" in element)) return (element as Element).getClientRects().length > 0;
  return element.checkVisibility();
}
