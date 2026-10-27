import type { Collection } from "@linkables/shared/collections";
import { useId } from "react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { useCollectionNameForm } from "./use-collection-name-form";
import { useCreateCollection } from "./use-collections";

type NewCollectionFormProps = {
  variant: "sidebar" | "sheet";
  onCreated: (collection: Collection) => void;
  onCancel: () => void;
};

// Enter creates, Esc cancels; a name the user already has stays in the field with the reason.
export function NewCollectionForm({ variant, onCreated, onCancel }: NewCollectionFormProps) {
  const create = useCreateCollection();
  const { register, onSubmit, error, isSubmitting } = useCollectionNameForm({
    save: async (name) => { onCreated(await create.mutateAsync(name)); },
  });
  const errorId = useId();
  const field = register("name");
  const sheet = variant === "sheet";

  return (
    <form noValidate onSubmit={onSubmit} className={cn("flex flex-col gap-1", sheet ? "animate-pop" : "animate-pop px-1 pb-1.5")}>
      <div className="flex gap-2">
        <input
          {...field}
          autoFocus
          autoComplete="off"
          placeholder={sheet ? "Name your collection" : "Name it, then Enter"}
          aria-label="New collection name"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              onCancel();
            }
          }}
          onBlur={(event) => {
            void field.onBlur(event);
            if (!sheet && event.currentTarget.value.trim() === "") onCancel();
          }}
          className={cn(
            "min-w-0 flex-1 rounded-sm px-3 outline-none focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring aria-invalid:shadow-[inset_0_0_0_1.5px_var(--destructive)]",
            sheet ? "h-[50px] rounded-xl bg-muted text-base" : "h-9 bg-card text-[13.5px] shadow-[inset_0_0_0_1px_var(--line-strong)]",
          )}
        />
        {sheet ? (
          <Button type="submit" size="touch" disabled={isSubmitting} className="h-[50px] px-[18px]">
            Create
          </Button>
        ) : null}
      </div>
      {error ? (
        <p id={errorId} role="alert" className="px-1 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}
