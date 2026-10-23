// Apple keyboards say ⌘ where others say Ctrl.
export function isApple(): boolean {
  return /Mac|iPhone|iPad/.test(navigator.platform) || /Mac OS X/.test(navigator.userAgent);
}

export function modKeyLabel(): string {
  return isApple() ? "⌘" : "Ctrl ";
}
