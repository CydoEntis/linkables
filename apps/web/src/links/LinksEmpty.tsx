import { Link } from "@tanstack/react-router";
import { SAVE_ANYWHERE_PATH } from "../save-anywhere/SaveAnywherePage";
import type { LinksView } from "./links-search";
import { FirstLinks } from "./FirstLinks";
import type { ListScope } from "./use-links";

type EmptyCopy = { title: string; web: string; phone: string };

const EMPTY_COPY: Record<Exclude<LinksView, "all"> | "collection", EmptyCopy> = {
  pinned: {
    title: "Nothing pinned yet",
    web: "Pinned links stay here, at the top.",
    phone: "Pinned links stay here, at the top.",
  },
  inbox: {
    title: "All sorted",
    web: "Every link is in a collection. New saves will show up here.",
    phone: "New saves will show up here.",
  },
  collection: {
    title: "Nothing here yet",
    web: "Drag a link onto this collection in the sidebar, or use Add to….",
    phone: "Swipe a link left and tap Add to.",
  },
};

export function LinksEmpty({ scope }: { scope: ListScope }) {
  const kind = "view" in scope ? scope.view : "collection";
  if (kind === "all") return <FirstLinks />;
  const copy = EMPTY_COPY[kind];
  return (
    <div className="flex animate-fade-in flex-col gap-1.5 px-3 py-10 md:gap-2 md:px-3.5 md:py-14">
      <p className="text-[17px] font-bold md:text-xl">{copy.title}</p>
      <p className="max-w-[440px] text-sm leading-normal text-muted-foreground md:text-[14.5px]">
        <span className="md:hidden">{copy.phone}</span>
        <span className="hidden md:inline">{copy.web}</span>
      </p>
      {kind === "inbox" ? <SaveAnywhereLink /> : null}
    </div>
  );
}

function SaveAnywhereLink() {
  return (
    <Link
      to={SAVE_ANYWHERE_PATH}
      className="flex min-h-11 items-center self-start text-sm font-semibold text-primary underline-offset-4 hover:underline md:text-[14.5px]"
    >
      See how to save from anywhere
    </Link>
  );
}
