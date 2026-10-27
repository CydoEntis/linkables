import { useState, type ReactNode } from "react";
import { BlockedBanner } from "../sharing/BlockedBanner";
import { openAll } from "../sharing/open-all";
import { needsConfirm, useAskBeforeOpening } from "./confirm-setting";
import { OpenConfirmDialog } from "./OpenConfirmDialog";

type Attempt = { opened: number; blocked: readonly string[]; total: number };

type OpenLinks = {
  // Opens the links, after the confirm when there are several and the setting (or the count) asks for one.
  request: (urls: readonly string[], onOpened?: () => void) => void;
  // The confirm and the blocked pop-ups banner, for the caller to place.
  dialog: ReactNode;
  banner: ReactNode;
};

type Pending = { urls: readonly string[]; onOpened: (() => void) | undefined };

export function useOpenLinks(): OpenLinks {
  const ask = useAskBeforeOpening((state) => state.ask);
  const setAsk = useAskBeforeOpening((state) => state.setAsk);
  const [pending, setPending] = useState<Pending | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);

  function run({ urls, onOpened }: Pending) {
    const result = openAll(urls);
    setAttempt({ opened: result.opened.length, blocked: result.blocked, total: urls.length });
    onOpened?.();
  }

  function retryBlocked(current: Attempt) {
    const result = openAll(current.blocked);
    setAttempt({ ...current, opened: current.total - result.blocked.length, blocked: result.blocked });
  }

  const request: OpenLinks["request"] = (urls, onOpened) => {
    if (urls.length === 0) return;
    const next = { urls, onOpened };
    if (needsConfirm(urls.length, ask)) setPending(next);
    else run(next);
  };

  const dialog = (
    <OpenConfirmDialog
      count={pending?.urls.length ?? null}
      onCancel={() => { setPending(null); }}
      onConfirm={(dontAskAgain) => {
        if (pending === null) return;
        if (dontAskAgain) setAsk(false);
        setPending(null);
        run(pending);
      }}
    />
  );
  // The banner is always the big-screen one: its retry button is what helps on a phone too, one link per tap.
  const banner =
    attempt !== null && attempt.blocked.length > 0 ? (
      <BlockedBanner wide opened={attempt.opened} blocked={attempt.blocked.length} total={attempt.total} onOpenRest={() => { retryBlocked(attempt); }} />
    ) : null;

  return { request, dialog, banner };
}
