import { useId, type ReactNode } from "react";
import { cn } from "cn";

type SettingsSectionProps = { title: string; children: ReactNode; className?: string };

// The title sits above the card, as in the round 2 handoff; rows inside are split by 1 px lines.
export function SettingsSection({ title, children, className }: SettingsSectionProps) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2.5">
      <h2 id={headingId} className="px-1 text-[13px] font-semibold text-muted-foreground">
        {title}
      </h2>
      <div className={cn("overflow-hidden rounded-2xl border border-border bg-card", className)}>{children}</div>
    </section>
  );
}

type SettingsRowProps = { label: string; detail?: ReactNode; leading?: ReactNode; children?: ReactNode };

// An optional icon or avatar, a label with its detail, then the row's actions; they wrap on a phone.
export function SettingsRow({ label, detail, leading, children }: SettingsRowProps) {
  return (
    <div className="flex flex-wrap items-center gap-3.5 border-t border-border px-[18px] py-4 first:border-t-0">
      {leading}
      <div className="flex min-w-40 flex-1 flex-col gap-0.5">
        <p className="text-[15px] font-semibold wrap-anywhere">{label}</p>
        {detail ? <div className="text-[13px] leading-normal text-muted-foreground wrap-anywhere">{detail}</div> : null}
      </div>
      {children ? <div className="flex shrink-0 flex-wrap gap-2">{children}</div> : null}
    </div>
  );
}

// The round 2 settings action: a ghost button a little smaller than the touch size.
export const SETTINGS_ACTION = "h-[38px] gap-2 px-3.5 text-[13.5px] font-bold";
