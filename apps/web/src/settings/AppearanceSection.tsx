import { SettingsRow, SettingsSection } from "./SettingsSection";

// Dark is the only drawn theme (ADR-0006); the row keeps Light's place for when it is.
export function AppearanceSection() {
  return (
    <SettingsSection title="Appearance">
      <SettingsRow label="Theme" detail="A light theme is on the way.">
        <div role="radiogroup" aria-label="Theme" className="flex gap-0.5 rounded-[11px] bg-muted p-[3px] text-[13px] font-semibold">
          <span role="radio" aria-checked="true" tabIndex={0} className="flex h-8 items-center rounded-lg bg-accent px-3.5">
            Dark
          </span>
          <span role="radio" aria-checked="false" aria-disabled="true" className="flex h-8 items-center gap-1.5 rounded-lg px-3.5 text-subtle-foreground">
            Light
            <span className="rounded-full bg-line-strong px-1.5 py-px text-[11px]">Soon</span>
          </span>
        </div>
      </SettingsRow>
    </SettingsSection>
  );
}
