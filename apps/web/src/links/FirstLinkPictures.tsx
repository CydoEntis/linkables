import { Check } from "lucide-react";
import { Mark } from "../marketing/Mark";

// Small drawings of each way to save, for the new account's cards. Decorative only.

export function PastePicture() {
  return (
    <div className="flex h-[46px] w-full max-w-[250px] items-center gap-2 rounded-xl border-[1.5px] border-primary bg-card pr-1.5 pl-3 font-mono text-[11.5px]">
      <span className="min-w-0 flex-1 truncate">youtube.com/watch?v=Kx9…</span>
      <span className="flex h-8 items-center rounded-lg bg-primary px-[11px] font-sans text-xs font-bold text-primary-foreground">Save</span>
    </div>
  );
}

const SHARE_TARGETS = [
  { name: "Messages", tile: "bg-[#2f6df6]" },
  { name: "linkables", tile: "bg-background shadow-[0_0_0_2px_var(--primary)]", mark: true },
  { name: "Notes", tile: "bg-accent" },
  { name: "More", tile: "bg-accent" },
] as const;

export function SharePicture() {
  return (
    <div className="flex items-start gap-3.5">
      {SHARE_TARGETS.map((target) => (
        <span
          key={target.name}
          className={`flex flex-col items-center gap-1.5 text-[10.5px] ${"mark" in target ? "font-bold text-foreground" : "text-muted-foreground"}`}
        >
          <span className={`flex size-11 items-center justify-center rounded-full ${target.tile}`}>
            {"mark" in target ? <Mark size={22} /> : null}
          </span>
          {target.name}
        </span>
      ))}
    </div>
  );
}

export function ChromePicture() {
  return (
    <div className="flex h-11 w-full max-w-[260px] items-center gap-2 rounded-full bg-card pr-1.5 pl-3.5">
      <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground">seriouseats.com/curry</span>
      <span className="flex h-8 items-center gap-1.5 rounded-full bg-primary pr-3 pl-[9px] text-xs font-bold text-primary-foreground">
        <Check strokeWidth={3} className="size-[13px]" />
        Saved
      </span>
    </div>
  );
}
