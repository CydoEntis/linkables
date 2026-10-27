import { cn } from "cn";
import { BIG_OPEN_COUNT, useAskBeforeOpening } from "../open-links/confirm-setting";
import { SettingsRow, SettingsSection } from "./SettingsSection";

export function OpeningLinksSection() {
  const ask = useAskBeforeOpening((state) => state.ask);
  const setAsk = useAskBeforeOpening((state) => state.setAsk);
  return (
    <SettingsSection title="Opening links">
      <SettingsRow
        label="Ask before opening several links"
        detail={`Open all and Open selected check first. More than ${String(BIG_OPEN_COUNT)} links always ask. Remembered on this device.`}
      >
        <button
          type="button"
          role="switch"
          aria-checked={ask}
          aria-label="Ask before opening several links"
          onClick={() => { setAsk(!ask); }}
          className="flex h-11 w-14 items-center justify-center md:h-8 md:w-auto"
        >
          <span
            aria-hidden
            className={cn("flex h-7 w-12 items-center rounded-full p-[3px] transition-colors", ask ? "bg-primary" : "bg-line-strong")}
          >
            <span className={cn("size-[22px] rounded-full bg-white shadow transition-transform", ask && "translate-x-5")} />
          </span>
        </button>
      </SettingsRow>
    </SettingsSection>
  );
}
