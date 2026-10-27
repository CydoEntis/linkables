import type { ReactNode } from "react";
import { PRIMARY_BUTTON, Wordmark } from "../ui";
import { isFirefox } from "../side-panel/open-side-panel";
import { useHostAccess } from "./host-access";

// Firefox only: it lets people switch the host permissions off, so there the pop-up or
// panel waits behind one button that asks for them. In Chrome, "on click" site access also
// makes contains() false, and request() cannot change that, so Chrome never gets the gate.
export function HostAccessGate({ children }: { children: ReactNode }) {
  if (!isFirefox()) return children;
  return <FirefoxGate>{children}</FirefoxGate>;
}

function FirefoxGate({ children }: { children: ReactNode }) {
  const { granted, failed, grant } = useHostAccess();
  if (granted !== false) return children;
  return (
    <main className="flex flex-col gap-3 p-4">
      <Wordmark />
      <p className="text-[14px] leading-snug">linkables needs your permission to reach linkables.app before it can save pages.</p>
      <button type="button" onClick={grant} className={PRIMARY_BUTTON}>
        Allow access to linkables.app
      </button>
      {failed && (
        <p role="alert" className="text-[13px] leading-snug text-red-700">
          Couldn't ask for access, or it was declined. Allow it under Permissions in about:addons.
        </p>
      )}
    </main>
  );
}
