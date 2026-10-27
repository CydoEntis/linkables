import type { Collection, ListedCollection } from "@linkables/shared/collections";
import type { SavedLink } from "@linkables/shared/links";
import { Check, Plus } from "lucide-react";
import { useState, type KeyboardEvent, type Ref } from "react";
import { toast } from "sonner";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { useCollectionsUi } from "./collections-ui-store";
import { displayName } from "./display-name";
import { GroupPicker } from "./GroupPicker";
import { MiniCover } from "./MiniCover";
import { nameProblem } from "./collection-name-form";
import { NewCollectionForm } from "./NewCollectionForm";
import { hasExactName, matchingCollections, useFrozenOrder } from "./picker";
import { useCollections, useCreateCollection } from "./use-collections";
import { useMembership } from "./use-membership";

type CollectionPickerProps = {
  link: SavedLink;
  // The popover finds or creates from one field; the phone sheet searches and has its own New collection form.
  variant: "popover" | "sheet";
  inputRef?: Ref<HTMLInputElement>;
};

// Ticks are tracked here from the link as it was when the picker opened, so the
// picker keeps working while the row behind it leaves the list.
export function CollectionPicker({ link, variant, inputRef }: CollectionPickerProps) {
  const collections = useCollections();
  const ordered = useFrozenOrder(collections.data ?? []);
  const setFiled = useMembership();
  const create = useCreateCollection();
  const [query, setQuery] = useState("");
  const [filedIds, setFiledIds] = useState<ReadonlySet<string>>(() => new Set(link.collections.map((item) => item.id)));
  const [creating, setCreating] = useState(false);
  const groupedId = useCollectionsUi((state) => state.groupedCollectionId);
  const sheet = variant === "sheet";

  const matches = matchingCollections(ordered, query);
  const createName = !sheet && query.trim() !== "" && !hasExactName(ordered, query) ? query.trim() : null;

  function file(collection: Pick<Collection, "id" | "name">, filed: boolean) {
    const onFiled = (isFiled: boolean) => {
      setFiledIds((current) => {
        const next = new Set(current);
        if (isFiled) next.add(collection.id);
        else next.delete(collection.id);
        return next;
      });
    };
    setFiled({ link, collection: { id: collection.id, name: collection.name }, filed }, { onFiled });
  }

  async function createAndFile(name: string) {
    try {
      file(await create.mutateAsync(name), true);
      setQuery("");
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      const message = nameProblem(error, name, ordered);
      if (message) toast.error(message);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const first = matches[0];
    if (first && (query.trim() === "" || hasExactName(ordered, query))) file(first, !filedIds.has(first.id));
    else if (createName) void createAndFile(createName);
  }

  return (
    <div className={cn("flex min-h-0 flex-col", sheet ? "gap-3.5" : "gap-0.5")}>
      <input
        ref={inputRef}
        value={query}
        onChange={(event) => { setQuery(event.target.value); }}
        onKeyDown={onKeyDown}
        autoComplete="off"
        placeholder={sheet ? "Find a collection" : "Find or create"}
        aria-label={sheet ? "Find a collection" : "Find or create a collection"}
        className={cn(
          "shrink-0 outline-none focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring",
          sheet
            ? "h-[46px] rounded-xl bg-muted px-3.5 text-base"
            : "mb-1 h-[38px] rounded-[9px] bg-background px-3 text-sm shadow-[inset_0_0_0_1px_var(--line-strong)]",
        )}
      />
      <PickerStatus collections={collections} />
      <ul aria-label="Collections" className={cn("flex min-h-0 flex-col overflow-auto", sheet ? "-mx-1.5" : "max-h-60")}>
        {matches.map((collection) => (
          <li key={collection.id}>
            <PickerRow
              collection={collection}
              filed={filedIds.has(collection.id)}
              size={sheet ? "sheet" : "popover"}
              onToggle={() => { file(collection, !filedIds.has(collection.id)); }}
            />
          </li>
        ))}
      </ul>
      {groupedId !== null && filedIds.has(groupedId) ? (
        <GroupPicker link={link} collectionId={groupedId} size={variant} />
      ) : null}
      {sheet && query.trim() !== "" && matches.length === 0 ? (
        <p className="px-2.5 py-3.5 text-sm text-subtle-foreground">No collection called that.</p>
      ) : null}
      {createName ? (
        <button
          type="button"
          onClick={() => void createAndFile(createName)}
          className="flex h-[38px] items-center rounded-[9px] px-2.5 text-left text-sm font-semibold text-primary hover:bg-muted"
        >
          <span className="truncate">+ Create “{createName}”</span>
        </button>
      ) : null}
      {sheet && creating ? (
        <NewCollectionForm
          variant="sheet"
          onCreated={(created) => {
            file(created, true);
            setCreating(false);
          }}
          onCancel={() => { setCreating(false); }}
        />
      ) : null}
      {sheet && !creating ? (
        <Button size="touch" onClick={() => { setCreating(true); }} className="h-[50px]">
          <Plus aria-hidden strokeWidth={2.4} />
          New collection
        </Button>
      ) : null}
    </div>
  );
}

function PickerStatus({ collections }: { collections: ReturnType<typeof useCollections> }) {
  if (collections.isPending) return <p className="px-2 py-2 text-[13px] text-muted-foreground">Loading collections…</p>;
  if (collections.isError) {
    return (
      <p role="alert" className="flex items-center justify-between gap-2 px-2 py-1 text-[13px] text-muted-foreground">
        Couldn't load your collections.
        <button type="button" onClick={() => void collections.refetch()} className="min-h-8 rounded-md px-2 font-semibold text-foreground hover:bg-muted">
          Try again
        </button>
      </p>
    );
  }
  return null;
}

type PickerRowProps = { collection: ListedCollection; filed: boolean; size: "popover" | "sheet"; onToggle: () => void };

function PickerRow({ collection, filed, size, onToggle }: PickerRowProps) {
  const sheet = size === "sheet";
  return (
    <button
      type="button"
      aria-pressed={filed}
      onClick={onToggle}
      className={cn(
        "flex w-full items-center text-left",
        sheet ? "min-h-[52px] gap-3 rounded-xl px-2.5 text-base" : "min-h-10 gap-2.5 rounded-[9px] px-2 text-sm hover:bg-muted",
        sheet && filed && "bg-[#232323]",
      )}
    >
      <MiniCover name={collection.name} cover={collection.cover} className={sheet ? "size-[30px] rounded-[8px]" : "size-[22px] rounded-[6px]"} />
      <span className={cn("min-w-0 flex-1 truncate", filed && sheet && "font-bold")}>{displayName(collection.name)}</span>
      <span
        aria-hidden
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full text-primary-foreground",
          sheet ? "size-6" : "size-5",
          filed ? "animate-tick bg-primary" : "bg-accent",
        )}
      >
        {filed ? <Check strokeWidth={3} className={sheet ? "size-3.5" : "size-3"} /> : null}
      </span>
    </button>
  );
}
