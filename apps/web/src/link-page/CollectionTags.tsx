import type { SavedLink } from "@linkables/shared/links";
import { Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { AddToPopover } from "../collections/AddToPopover";
import { useCollectionsUi } from "../collections/collections-ui-store";
import { displayName } from "../collections/display-name";
import { MiniCover } from "../collections/MiniCover";
import { useCollections } from "../collections/use-collections";

// 28 px pills; on touch the hit area reaches 44 px without changing the look.
const PILL = "relative flex h-7 items-center gap-1.5 rounded-full px-[11px] text-[12.5px] font-semibold max-md:after:absolute max-md:after:inset-x-0 max-md:after:-inset-y-2";

export function CollectionTags({ link }: { link: SavedLink }) {
  const collections = useCollections();
  const deleting = useCollectionsUi((state) => state.deleting);
  const [pickerOpen, setPickerOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const tags = link.collections.filter((collection) => !(collection.id in deleting));

  return (
    <ul aria-label="Collections" className="mt-1.5 flex flex-wrap gap-1.5">
      {tags.map((collection) => (
        <li key={collection.id}>
          <Link to="/c/$collectionId" params={{ collectionId: collection.id }} className={`${PILL} bg-accent hover:bg-[#333]`}>
            <MiniCover
              name={collection.name}
              cover={collections.data?.find((item) => item.id === collection.id)?.cover ?? []}
              className="size-3.5 rounded-[4px]"
            />
            {displayName(collection.name)}
          </Link>
        </li>
      ))}
      {tags.length === 0 ? (
        <li className={`${PILL} bg-muted font-normal text-muted-foreground`}>New</li>
      ) : null}
      <li>
        <AddToPopover
          link={link}
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          triggerRef={triggerRef}
          returnFocus
          className={`${PILL} text-muted-foreground hover:bg-muted hover:text-foreground data-popup-open:bg-muted`}
        >
          + Add to
        </AddToPopover>
      </li>
    </ul>
  );
}
