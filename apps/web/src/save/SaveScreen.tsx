import type { SaveLinkResponse } from "@linkables/shared/links";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "@tanstack/react-router";
import { AlertCircle, Check, Loader2, Undo2, Unlink } from "lucide-react";
import { useId, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { cn } from "cn";
import { saveLinkFormSchema, type SaveLinkFormInput, type SaveLinkFormOutput } from "../links/save-link-form";
import { CollectionPicks } from "./CollectionPicks";
import { Confetti } from "./Confetti";
import type { SharedSave } from "./use-shared-save";

type SaveScreenProps = {
  state: SharedSave;
  // The saved link's title once the metadata lands, else its URL.
  title?: string | undefined;
  onUndo?: (() => void) | undefined;
  undoing?: boolean | undefined;
  onRetry: () => void;
  onSaveUrl: (url: string) => void;
};

export function SaveScreen({ state, title, onUndo, undoing = false, onRetry, onSaveUrl }: SaveScreenProps) {
  return (
    <main className="flex min-h-svh flex-col px-[18px] pt-[max(28px,env(safe-area-inset-top))] pb-[calc(24px+env(safe-area-inset-bottom))] md:items-center md:justify-center md:py-12">
      <div className="flex w-full max-w-md flex-1 flex-col gap-6 md:flex-none md:rounded-[20px] md:bg-card md:p-6">
        <ScreenBody state={state} title={title} onUndo={onUndo} undoing={undoing} onRetry={onRetry} onSaveUrl={onSaveUrl} />
      </div>
    </main>
  );
}

// Render once, beside the screen, so the same live region outlives every state:
// a region mounted together with its text is often not read out.
export function SaveAnnouncement({ state }: { state: SharedSave }) {
  return (
    <p role="status" className="sr-only">
      {announcement(state)}
    </p>
  );
}

// The error is left to its role="alert" note, so it is not announced twice.
function announcement(state: SharedSave): string {
  switch (state.status) {
    case "saving":
      return "Saving…";
    case "saved":
      return state.link.duplicate ? "Already saved" : "Saved to linkables";
    case "no-link":
      return "No link found";
    case "removed":
      return "Removed";
    case "error":
      return "";
  }
}

function ScreenBody({ state, title, onUndo, undoing = false, onRetry, onSaveUrl }: SaveScreenProps) {
  switch (state.status) {
    case "saving":
      return (
        <>
          <Status icon={<Loader2 className="size-5 animate-spin" />} heading="Saving…" detail={state.url} />
          <Footer />
        </>
      );
    case "saved":
      return <Saved link={state.link} title={title} onUndo={onUndo} undoing={undoing} />;
    case "no-link":
      return (
        <>
          <Status icon={<Unlink className="size-5" />} heading="No link found" note="There was no link in what you shared. Paste one here." />
          <PasteForm onSaveUrl={onSaveUrl} />
          <Footer quiet />
        </>
      );
    case "error":
      return (
        <>
          <Status icon={<AlertCircle className="size-5 text-destructive" />} heading="Couldn't save" note={state.message} alert />
          <Footer quiet>
            <button type="button" onClick={onRetry} className="h-[54px] rounded-2xl bg-primary px-6 text-base font-bold text-primary-foreground">
              Retry
            </button>
          </Footer>
        </>
      );
    case "removed":
      return (
        <>
          <Status icon={<Undo2 className="size-5" />} heading="Removed" note="The link is no longer in linkables." />
          <Footer />
        </>
      );
  }
}

type SavedProps = { link: SaveLinkResponse; title?: string | undefined; onUndo?: (() => void) | undefined; undoing: boolean };

function Saved({ link, title, onUndo, undoing }: SavedProps) {
  const icon = (
    <>
      {link.duplicate ? null : <Confetti />}
      <Check strokeWidth={3} className="size-[21px] animate-check-draw [stroke-dasharray:24]" />
    </>
  );
  return (
    <>
      <Status
        icon={icon}
        tone="saved"
        celebrate={!link.duplicate}
        heading={link.duplicate ? "Already saved" : "Saved to linkables"}
        detail={title}
        note={link.duplicate ? savedOnNote(link, Date.now()) : undefined}
      />
      <CollectionPicks linkId={link.id} inCollections={link.collections.map((collection) => collection.id)} />
      <Footer>
        {onUndo ? (
          <button
            type="button"
            onClick={onUndo}
            disabled={undoing}
            className="h-[54px] rounded-2xl bg-muted px-[22px] text-base font-semibold text-muted-foreground hover:text-foreground disabled:opacity-60"
          >
            Undo
          </button>
        ) : null}
      </Footer>
    </>
  );
}

// "You saved this on Mar 3 · in Rust"; a link in no collection is in To sort.
export function savedOnNote(link: SaveLinkResponse, now: number): string {
  const at = new Date(link.savedAt);
  const sameYear = at.getFullYear() === new Date(now).getFullYear();
  const date = at.toLocaleDateString("en-US", { month: "short", day: "numeric", year: sameYear ? undefined : "numeric" });
  const where = link.collections.length > 0 ? link.collections.map((collection) => collection.name).join(", ") : "To sort";
  return `You saved this on ${date} · in ${where}`;
}

type StatusProps = {
  icon: ReactNode;
  heading: string;
  detail?: string | undefined;
  note?: string | undefined;
  tone?: "saved" | "neutral";
  celebrate?: boolean;
  alert?: boolean;
};

function Status({ icon, heading, detail, note, tone = "neutral", celebrate = false, alert = false }: StatusProps) {
  return (
    <header className="flex items-center gap-3">
      <span
        className={cn(
          "relative flex size-[46px] shrink-0 items-center justify-center rounded-full",
          tone === "saved" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
          celebrate && "animate-saved",
        )}
      >
        {icon}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <h1 className="text-[19px] font-bold">{heading}</h1>
        {detail ? <p className="truncate text-[13px] text-muted-foreground">{detail}</p> : null}
        {note ? (
          <p role={alert ? "alert" : undefined} className="text-[13px] text-muted-foreground">
            {note}
          </p>
        ) : null}
      </div>
    </header>
  );
}

// quiet: the view already has its one lime action, so Open linkables steps back to a ghost button.
function Footer({ children, quiet = false }: { children?: ReactNode; quiet?: boolean }) {
  return (
    <footer className="mt-auto flex gap-2.5 md:mt-0">
      {children}
      <Link
        to="/"
        className={cn(
          "flex h-[54px] flex-1 items-center justify-center rounded-2xl text-base font-bold",
          quiet ? "bg-muted text-foreground hover:bg-accent" : "bg-foreground text-background",
        )}
      >
        Open linkables
      </Link>
    </footer>
  );
}

function PasteForm({ onSaveUrl }: { onSaveUrl: (url: string) => void }) {
  const form = useForm<SaveLinkFormInput, unknown, SaveLinkFormOutput>({
    resolver: zodResolver(saveLinkFormSchema),
    defaultValues: { url: "" },
  });
  const errorId = useId();
  const error = form.formState.errors.url?.message;

  return (
    <form noValidate onSubmit={(event) => void form.handleSubmit(({ url }) => { onSaveUrl(url); })(event)} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          {...form.register("url")}
          type="text"
          inputMode="url"
          autoComplete="off"
          placeholder="Paste or type a link"
          aria-label="Link"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="h-[54px] min-w-0 flex-1 rounded-2xl bg-muted px-4 text-base outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-invalid:shadow-[0_0_0_1.5px_var(--destructive)]"
        />
        <button type="submit" className="h-[54px] shrink-0 rounded-2xl bg-primary px-5 text-base font-bold text-primary-foreground">
          Save
        </button>
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-[13px] text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}
