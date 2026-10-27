import { listCollectionsResponseSchema } from "@linkables/shared/collections";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { cn } from "cn";
import { api } from "../api/api";
import { tileFor } from "../links/link-display";
import { invalidateGroups } from "../collections/use-groups";
import { linksKeys } from "../links/use-links";

type ListedCollection = z.infer<typeof listCollectionsResponseSchema>["items"][number];

// The share card shows a few recent collections, as in the handoff; the rest are one tap away.
const QUICK_PICKS = 4;

const collectionsKey = ["collections"] as const;

function useCollections() {
  return useQuery({
    queryKey: collectionsKey,
    queryFn: ({ signal }) => api.request("/collections", listCollectionsResponseSchema, { signal }),
    select: (data) => data.items,
  });
}

function useMembership(linkId: string, initial: string[]) {
  const queryClient = useQueryClient();
  const [ticked, setTicked] = useState(() => new Set(initial));
  const toggle = useMutation({
    mutationFn: ({ collectionId, on }: { collectionId: string; on: boolean }) =>
      api.request(`/collections/${collectionId}/links/${linkId}`, z.null(), { method: on ? "PUT" : "DELETE" }),
    onMutate: ({ collectionId, on }) => { setTicked((current) => withMember(current, collectionId, on)); },
    onError: (_error, { collectionId, on }) => {
      setTicked((current) => withMember(current, collectionId, !on));
      toast.error("Couldn't change the collection. Try again.");
    },
    onSettled: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: linksKeys.all }),
      // Marked stale but not refetched here: the handoff freezes the order while the card is open.
      queryClient.invalidateQueries({ queryKey: collectionsKey, refetchType: "none" }),
      invalidateGroups(queryClient, { refetchType: "none" }),
    ]),
  });
  return { ticked, toggle: (collectionId: string) => { toggle.mutate({ collectionId, on: !ticked.has(collectionId) }); } };
}

function withMember(current: Set<string>, collectionId: string, on: boolean): Set<string> {
  const next = new Set(current);
  if (on) next.add(collectionId);
  else next.delete(collectionId);
  return next;
}

type CollectionPicksProps = { linkId: string; inCollections: string[] };

export function CollectionPicks({ linkId, inCollections }: CollectionPicksProps) {
  const collections = useCollections();
  const { ticked, toggle } = useMembership(linkId, inCollections);
  const [showAll, setShowAll] = useState(false);
  const headingId = useId();
  const items = collections.data ?? [];
  if (items.length === 0) return null;
  const shown = showAll ? items : items.slice(0, QUICK_PICKS);

  return (
    <section aria-labelledby={headingId} className="flex animate-rise flex-col gap-0.5">
      <h2 id={headingId} className="px-0.5 pb-1.5 text-[13px] font-semibold text-muted-foreground">
        Add to a collection
      </h2>
      <div className={cn("flex flex-col gap-0.5", showAll && "max-h-[46svh] overflow-y-auto")}>
        {shown.map((collection) => (
          <PickRow key={collection.id} collection={collection} on={ticked.has(collection.id)} onToggle={() => { toggle(collection.id); }} />
        ))}
      </div>
      {items.length > QUICK_PICKS && !showAll ? (
        <button
          type="button"
          onClick={() => { setShowAll(true); }}
          className="flex h-11 items-center self-start rounded-lg px-3 text-[15px] text-muted-foreground hover:text-foreground"
        >
          All collections ›
        </button>
      ) : null}
    </section>
  );
}

type PickRowProps = { collection: ListedCollection; on: boolean; onToggle: () => void };

function PickRow({ collection, on, onToggle }: PickRowProps) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onToggle}
      className={cn("flex h-[54px] items-center gap-3 rounded-xl px-3 text-left", on ? "bg-primary-soft" : "hover:bg-muted")}
    >
      <MiniCover cover={collection.cover} />
      <span className={cn("min-w-0 flex-1 truncate text-base", on ? "font-bold" : "font-semibold")}>{collection.name}</span>
      <span
        aria-hidden
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full",
          on ? "animate-tick bg-primary text-primary-foreground" : "bg-accent",
        )}
      >
        {on ? <Check strokeWidth={3} className="size-3.5" /> : null}
      </span>
    </button>
  );
}

function MiniCover({ cover }: { cover: ListedCollection["cover"] }) {
  return (
    <span aria-hidden className="grid size-[30px] shrink-0 grid-cols-2 gap-px overflow-hidden rounded-lg bg-[#262626]">
      {cover.map((tile, i) => (
        <span key={i} style={{ background: tileBackground(tile) }} />
      ))}
    </span>
  );
}

// Letter-tile colours only: a 15 px square is too small for a thumbnail to read.
function tileBackground(tile: ListedCollection["cover"][number]): string {
  if (tile.kind === "video") return "#1a1a1a";
  const { hue } = tileFor(tile.domain.replace(/^www\./, ""));
  return `oklch(0.33 0.055 ${String(hue)})`;
}
