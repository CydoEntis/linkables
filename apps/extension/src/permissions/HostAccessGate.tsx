import type { ReactNode } from "react";
import { PRIMARY_BUTTON, Wordmark } from "../ui";
import { useHostAccess } from "./host-access";

// Shows the pop-up or panel only once the extension may reach linkables; until then,
// one button that asks for that. Chrome grants it at install, so it never shows there.
export function HostAccessGate({ children }: { children: ReactNode }) {
  const { granted, grant } = useHostAccess();
  if (granted !== false) return children;
  return (
    <main className="flex flex-col gap-3 p-4">
      <Wordmark />
      <p className="text-[14px] leading-snug">linkables needs your permission to reach linkables.app before it can save pages.</p>
      <button type="button" onClick={grant} className={PRIMARY_BUTTON}>
        Allow access to linkables.app
      </button>
    </main>
  );
}
