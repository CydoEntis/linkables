import type { ReactNode } from "react";
import { MarketingFooter } from "./MarketingFooter";
import { MarketingHeader } from "./MarketingHeader";

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="lp min-h-svh bg-background text-foreground">
      <MarketingHeader />
      {children}
      <MarketingFooter />
    </div>
  );
}
