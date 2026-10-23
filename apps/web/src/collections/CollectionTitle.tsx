import type { ListedCollection } from "@linkables/shared/collections";
import { useId, useState } from "react";
import { displayName } from "./display-name";
import { useCollectionNameForm } from "./use-collection-name-form";
import { useRenameCollection } from "./use-collections";

const TITLE = "text-[26px] leading-[1.1] font-bold tracking-[-0.03em] md:text-[34px]";

// Click the name to rename it in place: Enter or leaving the field saves, Esc cancels.
export function CollectionTitle({ collection }: { collection: ListedCollection }) {
  const [editing, setEditing] = useState(false);
  if (editing) return <RenameForm collection={collection} onDone={() => { setEditing(false); }} />;
  return (
    <h1 className={TITLE}>
      <button
        type="button"
        title="Rename"
        onClick={() => { setEditing(true); }}
        className="-mx-1.5 cursor-text rounded-md px-1.5 text-left wrap-anywhere hover:bg-muted"
      >
        {displayName(collection.name)}
        <span className="sr-only">, rename</span>
      </button>
    </h1>
  );
}

function RenameForm({ collection, onDone }: { collection: ListedCollection; onDone: () => void }) {
  const rename = useRenameCollection(collection.id);
  const { register, onSubmit, error } = useCollectionNameForm({
    defaultName: collection.name,
    save: async (name) => {
      if (name !== collection.name) await rename.mutateAsync(name);
      onDone();
    },
  });
  const errorId = useId();
  const field = register("name");

  return (
    <form noValidate onSubmit={onSubmit} className="flex min-w-0 flex-col gap-1">
      <input
        {...field}
        autoFocus
        autoComplete="off"
        aria-label="Collection name"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onFocus={(event) => { event.currentTarget.select(); }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onDone();
          }
        }}
        onBlur={(event) => {
          void field.onBlur(event);
          if (!rename.isPending) onSubmit();
        }}
        className={`${TITLE} -mx-1.5 w-full min-w-0 rounded-md bg-muted px-1.5 outline-none focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring aria-invalid:outline-destructive`}
      />
      {error ? (
        <p id={errorId} role="alert" className="text-[13px] text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}
