import { Search } from "lucide-react";
import { useId } from "react";
import { cn } from "cn";
import { useSaveLinkForm } from "./use-save-link-form";

// shortcut: the bar only saves for now; typing to search arrives with the search ticket.
export function SaveBar({ className }: { className?: string }) {
  const { register, onSubmit, canSave, error } = useSaveLinkForm();
  const errorId = useId();

  return (
    <form noValidate onSubmit={onSubmit} className={className}>
      <label
        className={cn(
          "flex h-[52px] cursor-text items-center gap-3 rounded-xl bg-card pr-2 pl-[18px] shadow-[0_0_0_1px_var(--line-strong)] transition-shadow duration-200",
          "has-[input:focus-visible]:shadow-[0_0_0_2px_var(--ring)]",
          canSave && "shadow-[0_0_0_1.5px_var(--ring),0_0_0_6px_var(--primary-soft)]",
          error && "shadow-[0_0_0_1.5px_var(--destructive)] has-[input:focus-visible]:shadow-[0_0_0_2px_var(--destructive)]",
        )}
      >
        <Search aria-hidden strokeWidth={2.2} className="size-[17px] shrink-0 text-subtle-foreground" />
        <input
          {...register("url")}
          type="text"
          inputMode="url"
          autoComplete="off"
          autoFocus
          placeholder="Search or paste a link"
          aria-label="Search or paste a link"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="h-full min-w-0 flex-1 bg-transparent text-base outline-none"
        />
        {canSave ? (
          <button
            type="submit"
            className="h-[38px] shrink-0 animate-pop rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground"
          >
            Save link
          </button>
        ) : null}
      </label>
      {error ? (
        <p id={errorId} role="alert" className="px-1 pt-2 text-[13px] text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}
