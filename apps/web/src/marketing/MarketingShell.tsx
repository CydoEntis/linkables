import type { ReactNode } from "react";
import { MarkWordmark } from "./Mark";

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="lp min-h-svh bg-background text-foreground">
      <header className="mx-auto flex max-w-[1100px] items-center justify-between px-5 py-5">
        <a href="/" aria-label="linkables home"><MarkWordmark /></a>
        <a href="/sign-in" className="text-sm text-muted-foreground">Open library</a>
      </header>
      {children}
      <footer className="mx-auto flex max-w-[1100px] flex-wrap gap-5 px-5 py-8 text-sm text-muted-foreground">
        <a href="/privacy">Privacy</a><a href="/terms">About</a><a href="/support">Help</a>
        <span>Free and open source · AGPL-3.0</span>
      </footer>
    </div>
  );
}
