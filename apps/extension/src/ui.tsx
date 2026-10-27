import { BUTTON_DARK, BUTTON_PRIMARY } from "@linkables/shared/ui";
import { cn } from "cn";
import type { ReactNode } from "react";

// Button tiers from the handoff: one lime primary per view, everything else ghost.
export const PRIMARY_BUTTON = cn(
  BUTTON_PRIMARY,
  "flex h-11 w-full items-center justify-center gap-2 rounded-xl text-[14.5px] disabled:cursor-default disabled:opacity-50",
);

export const GHOST_BUTTON = cn(
  BUTTON_DARK,
  "flex h-[34px] items-center justify-center rounded-[10px] bg-accent px-4 text-[13px] font-bold text-foreground hover:bg-muted disabled:cursor-default disabled:opacity-50",
);

// The quick-action tiles under a saved page: icon over a short label.
export const TILE = cn(BUTTON_DARK, "flex h-14 flex-col items-center justify-center gap-1 rounded-xl text-[12px]");

export const QUIET_LINK = "rounded-md px-1 text-[12.5px] text-muted-foreground hover:text-foreground";

export const FILLED_FIELD =
  "w-full rounded-[10px] bg-muted text-foreground outline-none aria-invalid:shadow-[0_0_0_2px_var(--destructive)]";

export function Wordmark() {
  return (
    <span className="flex items-center gap-2">
      <img src="/logo-96.png" alt="" width={18} height={18} className="size-[18px] object-contain" />
      <span className="font-display text-[14px] font-semibold tracking-[-0.03em]">linkables</span>
    </span>
  );
}

export function Alert({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="text-[13px] leading-snug text-destructive">
      {children}
    </p>
  );
}

export function OfflineNote() {
  return (
    <p role="status" className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-[12.5px]">
      <span aria-hidden className="size-2 flex-none rounded-full bg-destructive" />
      You're offline. Check your connection.
    </p>
  );
}
