import { AlertCircle, Ban, LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";
import { SignedInAs } from "../auth/SignedInAs";
import { signOutByHand } from "../auth/supabase";
import { GHOST_BUTTON, PRIMARY_BUTTON, QUIET_LINK } from "../ui";
import { SAVE_MESSAGES } from "./save-flow";
import { Saved } from "./Saved";
import { useSaveCurrentTab } from "./use-save-current-tab";

export function SaveView() {
  const save = useSaveCurrentTab();
  const outcome = save.data;
  return (
    <main className="animate-pop">
      <p role="status" className="sr-only">
        {outcome?.status === "saved" ? (outcome.link.duplicate ? "Already saved" : "Saved to linkables") : null}
      </p>
      {save.isError ? (
        <SaveFailed message={SAVE_MESSAGES.failed} onRetry={() => { save.mutate(); }} />
      ) : outcome === undefined ? (
        <Saving />
      ) : outcome.status === "cant" ? (
        <CantSave reason={outcome.reason} />
      ) : outcome.status === "error" ? (
        <SaveFailed message={outcome.message} onRetry={() => { save.mutate(); }} />
      ) : (
        <Saved link={outcome.link} pageTitle={outcome.pageTitle} />
      )}
      <Footer />
    </main>
  );
}

function Status({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 p-4">
      <span className="flex size-10 flex-none items-center justify-center rounded-full bg-muted text-muted-foreground">{icon}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h1 className="text-[16.5px] font-bold">{title}</h1>
        {children}
      </div>
    </div>
  );
}

function Saving() {
  return <Status icon={<LoaderCircle aria-hidden className="size-[18px] animate-spin" />} title="Saving…" />;
}

function CantSave({ reason }: { reason: string }) {
  return (
    <Status icon={<Ban aria-hidden className="size-[18px]" />} title="This page can't be saved">
      <p className="text-[13px] leading-snug text-muted-foreground">{reason}</p>
    </Status>
  );
}

function SaveFailed({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <>
      <Status icon={<AlertCircle aria-hidden className="size-[18px] text-destructive" />} title="Couldn't save">
        <p role="alert" className="text-[13px] leading-snug text-muted-foreground">
          {message}
        </p>
      </Status>
      <div className="px-4 pb-3">
        <button type="button" onClick={onRetry} className={PRIMARY_BUTTON}>
          Try again
        </button>
      </div>
    </>
  );
}

// The handoff's footer hint (Alt+Shift+S) belongs to Phase 2; sign-out takes its place.
function Footer() {
  return (
    <footer className="flex items-center justify-between gap-3 border-t border-border py-2.5 pr-3 pl-3">
      <div className="flex min-w-0 flex-col items-start gap-0.5">
        <SignedInAs />
        <button type="button" onClick={() => void signOutByHand()} className={QUIET_LINK}>
          Sign out
        </button>
      </div>
      <button type="button" onClick={() => { window.close(); }} className={GHOST_BUTTON}>
        Done
      </button>
    </footer>
  );
}
