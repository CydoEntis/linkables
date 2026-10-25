import { COLLECTION_NAME_MAX_LENGTH, type ListedCollection } from "@linkables/shared/collections";
import { cn } from "cn";
import { Check } from "lucide-react";
import { useId, useState, type KeyboardEvent } from "react";
import { ApiError } from "../api/client";
import { Alert } from "../ui";
import { displayName, freezeOrder, pickerRows } from "./picker";
import { useCollections, useCreateCollection, type CollectionRef } from "./use-collections";

type CollectionPickerProps = {
  filedIds: ReadonlySet<string>;
  onFile: (collection: CollectionRef, filed: boolean) => void;
};

export function CollectionPicker({ filedIds, onFile }: CollectionPickerProps) {
  const collections = useCollections();
  const create = useCreateCollection();
  const [order, setOrder] = useState<readonly string[]>([]);
  const [query, setQuery] = useState("");
  const [createProblem, setCreateProblem] = useState<string | null>(null);
  const headingId = useId();
  const items = collections.data ?? [];
  const frozen = freezeOrder(order, items);
  if (frozen.join() !== order.join()) setOrder(frozen);
  const { rows, createName } = pickerRows({ order: frozen, collections: items, filedIds, query });

  async function createAndFile(name: string) {
    setCreateProblem(null);
    try {
      const created = await create.mutateAsync(name);
      onFile(created, true);
      setQuery("");
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      setCreateProblem(
        error.code === "VALIDATION"
          ? `Collection names can be up to ${String(COLLECTION_NAME_MAX_LENGTH)} characters.`
          : `Couldn't create ${displayName(name)}. Try again.`,
      );
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const first = rows[0];
    if (first && createName === null) onFile(first, !filedIds.has(first.id));
    else if (createName) void createAndFile(createName);
  }

  return (
    <section aria-labelledby={headingId} className="flex animate-rise flex-col gap-1 px-4 pb-3 [animation-delay:0.1s]">
      <h2 id={headingId} className="px-0.5 pb-1 text-[12px] font-semibold text-muted-foreground">
        Move to a collection <span className="font-normal text-subtle-foreground">· optional</span>
      </h2>
      <PickerStatus collections={collections} />
      <ul aria-label="Collections" className="-mx-2 flex max-h-[220px] flex-col gap-0.5 overflow-auto">
        {rows.map((collection) => (
          <li key={collection.id}>
            <PickRow collection={collection} filed={filedIds.has(collection.id)} onToggle={() => { onFile(collection, !filedIds.has(collection.id)); }} />
          </li>
        ))}
        {createName ? (
          <li>
            <button
              type="button"
              disabled={create.isPending}
              onClick={() => void createAndFile(createName)}
              className="flex min-h-10 w-full items-center rounded-[10px] px-2 text-left text-[13.5px] font-semibold text-primary hover:bg-muted"
            >
              <span className="truncate">+ Create “{createName}”</span>
            </button>
          </li>
        ) : null}
      </ul>
      <input
        value={query}
        onChange={(event) => { setQuery(event.target.value); }}
        onKeyDown={onKeyDown}
        autoComplete="off"
        placeholder="Search collections"
        aria-label="Search collections"
        className="mt-1 h-9 rounded-[9px] bg-muted px-2.5 text-[12.5px] outline-none focus-visible:outline-2 focus-visible:outline-offset-0"
      />
      {createProblem ? <Alert>{createProblem}</Alert> : null}
    </section>
  );
}

function PickerStatus({ collections }: { collections: ReturnType<typeof useCollections> }) {
  if (collections.isPending) return <p className="px-0.5 py-1 text-[12.5px] text-muted-foreground">Loading collections…</p>;
  if (collections.isError) {
    return (
      <p role="alert" className="flex items-center justify-between gap-2 px-0.5 text-[12.5px] text-muted-foreground">
        Couldn't load your collections.
        <button type="button" onClick={() => void collections.refetch()} className="min-h-8 rounded-md px-2 font-semibold text-foreground hover:bg-muted">
          Try again
        </button>
      </p>
    );
  }
  return null;
}

type PickRowProps = { collection: ListedCollection; filed: boolean; onToggle: () => void };

function PickRow({ collection, filed, onToggle }: PickRowProps) {
  return (
    <button
      type="button"
      aria-pressed={filed}
      onClick={onToggle}
      className={cn("flex min-h-10 w-full items-center gap-2.5 rounded-[10px] px-2 text-left text-[13.5px] hover:bg-muted", filed && "bg-primary-soft")}
    >
      <NameTile name={collection.name} />
      <span className={cn("min-w-0 flex-1 truncate", filed && "font-bold")}>{displayName(collection.name)}</span>
      <span
        aria-hidden
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full text-primary-foreground",
          filed ? "animate-tick bg-primary" : "bg-accent",
        )}
      >
        {filed ? <Check strokeWidth={3} className="size-3" /> : null}
      </span>
    </button>
  );
}

function nameHue(name: string): number {
  const lower = name.toLowerCase();
  let hue = 0;
  for (let i = 0; i < lower.length; i += 1) hue = (hue * 31 + lower.charCodeAt(i)) % 360;
  return hue;
}

// A tinted letter tile per name, from the handoff's tile colours; covers stay in the web app.
function NameTile({ name }: { name: string }) {
  const hue = nameHue(name);
  return (
    <span
      aria-hidden
      className="flex size-6 shrink-0 items-center justify-center rounded-[7px] text-[11px] font-bold"
      style={{ background: `oklch(0.33 0.055 ${String(hue)})`, color: `oklch(0.86 0.08 ${String(hue)})` }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
