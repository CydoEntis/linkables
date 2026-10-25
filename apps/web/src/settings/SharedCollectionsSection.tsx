import type { OwnSharedCollection } from "@linkables/shared/sharing";
import { Link } from "@tanstack/react-router";
import { Copy, Globe } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { displayName } from "../collections/display-name";
import { MiniCover } from "../collections/MiniCover";
import { useCollections } from "../collections/use-collections";
import { copyLink } from "../links/share-link";
import { TurnOffLinkButton } from "../sharing/TurnOffLinkButton";
import { sharedUrl, useOwnShared, useSetSharing } from "../sharing/use-share";
import { SettingsSection } from "./SettingsSection";

export function SharedCollectionsSection() {
  const shared = useOwnShared();
  return (
    <SettingsSection title="Shared collections">
      {shared.isPending ? <p className="px-[18px] py-4 text-sm text-muted-foreground">Loading…</p> : null}
      {shared.isError ? (
        <div className="flex flex-wrap items-center gap-3 px-[18px] py-4">
          <p className="text-sm text-muted-foreground">Couldn't load your shared collections.</p>
          <Button variant="ghost" size="touch" onClick={() => void shared.refetch()}>
            Try again
          </Button>
        </div>
      ) : null}
      {shared.data?.length === 0 ? <NothingShared /> : null}
      {shared.data && shared.data.length > 0 ? (
        <ul className="flex flex-col">
          {shared.data.map((collection) => (
            <SharedRow key={collection.id} collection={collection} />
          ))}
        </ul>
      ) : null}
      <p className="border-t border-border px-[18px] py-3 text-[12.5px] text-subtle-foreground">
        Viewers see titles, images and descriptions. Never your notes or pins.
      </p>
    </SettingsSection>
  );
}

function NothingShared() {
  return (
    <div className="flex items-center gap-3.5 px-[18px] py-[22px]">
      <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-muted text-muted-foreground">
        <Globe className="size-[18px]" />
      </span>
      <p className="text-[14px] leading-normal text-muted-foreground">Nothing is shared. Open a collection and press Share to make a view-only link.</p>
    </div>
  );
}

// The address without its scheme, as the handoff shows it: linkables.app/s/…
function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, "");
}

function SharedRow({ collection }: { collection: OwnSharedCollection }) {
  const setSharing = useSetSharing(collection.id);
  const cover = useCollections().data?.find((listed) => listed.id === collection.id)?.cover ?? [];
  const name = displayName(collection.name);
  const url = sharedUrl(collection.token);

  function turnOff() {
    setSharing.mutate(false, {
      onSuccess: () => { toast(`${name} is private again`); },
      onError: () => { toast.error("Couldn't turn the link off. Try again."); },
    });
  }

  return (
    <li aria-label={name} className="flex flex-wrap items-center gap-3.5 border-t border-border px-[18px] py-3.5 first:border-t-0">
      <MiniCover name={collection.name} cover={cover} className="size-10 rounded-[10px]" />
      <div className="flex min-w-[150px] flex-1 flex-col gap-0.5">
        <Link
          to="/c/$collectionId"
          params={{ collectionId: collection.id }}
          className="self-start text-[15px] font-semibold wrap-anywhere underline-offset-4 hover:underline"
        >
          {name}
        </Link>
        <span className="font-mono text-[12px] text-muted-foreground wrap-anywhere">{displayUrl(url)}</span>
      </div>
      <div className="flex gap-1.5">
        <Button variant="ghost" className="h-9 gap-2 px-3 text-[13px] font-bold" onClick={() => void copyLink(url)}>
          <Copy aria-hidden />
          Copy link
        </Button>
        <TurnOffLinkButton onConfirm={turnOff} pending={setSharing.isPending} />
      </div>
    </li>
  );
}
