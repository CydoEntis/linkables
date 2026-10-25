import type { OwnSharedCollection } from "@linkables/shared/sharing";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { displayName } from "../collections/display-name";
import { copyLink } from "../links/share-link";
import { sharedUrl, useOwnShared, useSetSharing } from "../sharing/use-share";
import { SettingsSection } from "./SettingsSection";

export function SharedCollectionsSection() {
  const shared = useOwnShared();
  return (
    <SettingsSection title="Shared collections">
      {shared.isPending ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
      {shared.isError ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted-foreground">Couldn't load your shared collections.</p>
          <Button variant="ghost" size="touch" onClick={() => void shared.refetch()}>
            Try again
          </Button>
        </div>
      ) : null}
      {shared.data?.length === 0 ? (
        <p className="text-[14px] leading-normal text-muted-foreground">
          No collection has its link on. Open a collection and choose Share to give anyone a view-only link.
        </p>
      ) : null}
      {shared.data && shared.data.length > 0 ? (
        <ul className="flex flex-col divide-y divide-border">
          {shared.data.map((collection) => (
            <SharedRow key={collection.id} collection={collection} />
          ))}
        </ul>
      ) : null}
    </SettingsSection>
  );
}

function SharedRow({ collection }: { collection: OwnSharedCollection }) {
  const setSharing = useSetSharing(collection.id);
  const name = displayName(collection.name);

  function turnOff() {
    setSharing.mutate(false, { onError: () => { toast.error("Couldn't turn the link off. Try again."); } });
  }

  return (
    <li className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <Link
        to="/c/$collectionId"
        params={{ collectionId: collection.id }}
        className="min-w-0 text-[15px] font-semibold wrap-anywhere underline-offset-4 hover:underline"
      >
        {name}
      </Link>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Button size="touch" aria-label={`Copy link to ${name}`} onClick={() => void copyLink(sharedUrl(collection.token))}>
          Copy link
        </Button>
        <Button variant="ghost" size="touch" aria-label={`Turn off link to ${name}`} disabled={setSharing.isPending} onClick={turnOff}>
          Turn off
        </Button>
      </div>
    </li>
  );
}
