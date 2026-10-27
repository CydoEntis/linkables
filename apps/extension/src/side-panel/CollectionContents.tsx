import type { ListedCollection } from "@linkables/shared/collections";
import { EyeOff } from "lucide-react";
import { useGroups } from "../collections/use-groups";
import { groupSections, type GroupSection } from "./group-sections";
import { Empty, LinkRow, ListProblem, RowsSkeleton } from "./LinkRows";
import { linkCount } from "./link-list";
import { appUrl, useCollectionLinks } from "./queries";

type CollectionContentsProps = { collection: ListedCollection; linkOn: boolean };

// A collection's links under its groups as headers; a collection without groups is one list.
export function CollectionContents({ collection, linkOn }: CollectionContentsProps) {
  const groups = useGroups(collection.id);
  if (groups.isPending) return <RowsSkeleton />;
  if (groups.isError) return <ListProblem onRetry={() => void groups.refetch()}>Couldn't load its groups.</ListProblem>;
  const sections = groupSections(groups.data, collection.linkCount);
  if (sections.length === 0) return <Section collection={collection} groupId={undefined} />;

  return (
    <div className="flex flex-col gap-2 pb-1">
      {sections.map((section) => (
        <GroupHeaderAndLinks key={section.id} collection={collection} section={section} linkOn={linkOn} />
      ))}
    </div>
  );
}

type GroupProps = { collection: ListedCollection; section: GroupSection; linkOn: boolean };

function GroupHeaderAndLinks({ collection, section, linkOn }: GroupProps) {
  return (
    <section aria-label={section.title} className="flex flex-col">
      <h3 className="flex items-center gap-2 px-1.5 pb-0.5 text-[12px] font-semibold text-muted-foreground">
        <span className="truncate">{section.title}</span>
        <span className="font-normal text-subtle-foreground">{linkCount(section.linkCount)}</span>
        {linkOn && !section.shared ? (
          <span className="flex items-center gap-1 font-normal">
            <EyeOff aria-hidden className="size-3" />
            Not shared
          </span>
        ) : null}
      </h3>
      <Section collection={collection} groupId={section.id} />
    </section>
  );
}

function Section({ collection, groupId }: { collection: ListedCollection; groupId: string | undefined }) {
  const links = useCollectionLinks(collection.id, groupId);
  if (links.isPending) return <RowsSkeleton />;
  if (links.isError) return <ListProblem onRetry={() => void links.refetch()}>Couldn't load these links.</ListProblem>;
  const { items, more } = links.data;
  if (items.length === 0) return <Empty>Nothing here yet.</Empty>;

  const now = Date.now();
  return (
    <>
      <ul className="flex flex-col">
        {items.map((link) => (
          <li key={link.id}>
            <LinkRow link={link} now={now} />
          </li>
        ))}
      </ul>
      {more ? (
        <a href={appUrl(`/c/${collection.id}`)} target="_blank" rel="noreferrer" className="self-center rounded-md px-2 py-1.5 text-[12.5px] text-muted-foreground hover:text-foreground">
          See all in linkables ↗
        </a>
      ) : null}
    </>
  );
}
