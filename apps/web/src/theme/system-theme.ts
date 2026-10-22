// The design calls for Light, Dark and System; until the picker exists, System is the only mode.
export function followSystemTheme(): void {
  const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const apply = () => document.documentElement.classList.toggle("dark", darkQuery.matches);
  apply();
  darkQuery.addEventListener("change", apply);
}
