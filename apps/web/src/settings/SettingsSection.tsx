import { useId, type ReactNode } from "react";

type SettingsSectionProps = { title: string; children: ReactNode };

export function SettingsSection({ title, children }: SettingsSectionProps) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3 rounded-[20px] bg-card p-5 md:p-6">
      <h2 id={headingId} className="text-[12.5px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

type SettingsRowProps = { label: string; detail?: ReactNode; children?: ReactNode };

// A label and its detail on the left, the row's actions on the right; stacked on a phone.
export function SettingsRow({ label, detail, children }: SettingsRowProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-[15px] font-semibold wrap-anywhere">{label}</p>
        {detail ? <div className="text-[14px] leading-normal text-muted-foreground wrap-anywhere">{detail}</div> : null}
      </div>
      {children ? <div className="flex shrink-0 flex-wrap gap-2">{children}</div> : null}
    </div>
  );
}
