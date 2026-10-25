import type { ReactNode } from "react";
import { cn } from "cn";
import { tileFor } from "../../links/link-display";

export type MockLink = { title: ReactNode; site: string; meta: string; video?: boolean };

// The app's letter-tile fallback, so the pictures need no third-party images.
export function Tile({ site, video = false, className }: { site: string; video?: boolean | undefined; className?: string }) {
  const { hue, letter } = tileFor(site);
  return (
    <span
      aria-hidden
      className={cn("flex shrink-0 items-center justify-center font-display font-semibold", className)}
      style={{
        background: `linear-gradient(140deg, oklch(0.33 0.055 ${String(hue)}), oklch(0.25 0.04 ${String(hue)}))`,
        color: `oklch(0.86 0.08 ${String(hue)})`,
      }}
    >
      {video ? "▶" : letter}
    </span>
  );
}

type MockRowProps = { link: MockLink; size?: "lg" | "sm"; className?: string; trailing?: ReactNode };

export function MockRow({ link, size = "lg", className, trailing }: MockRowProps) {
  const large = size === "lg";
  return (
    <div className={cn("flex items-center rounded-xl", large ? "gap-3.5 p-2.5" : "gap-[11px] px-2 py-[7px]", className)}>
      <Tile
        site={link.site}
        video={link.video}
        className={large ? "h-10 w-16 rounded-[9px] text-[13px]" : "h-[34px] w-[52px] rounded-lg text-[11px]"}
      />
      <span className="flex min-w-0 flex-1 flex-col gap-[3px] text-left">
        <span className={cn("truncate font-semibold", large ? "text-[15px]" : "text-[13px]")}>{link.title}</span>
        <span className={cn("truncate text-muted-foreground", large ? "text-xs" : "text-[11px]")}>
          {link.site} · {link.meta}
        </span>
      </span>
      {trailing}
    </div>
  );
}
