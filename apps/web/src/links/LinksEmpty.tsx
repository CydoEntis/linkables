import type { LinksView } from "./links-search";

type EmptyCopy = { title: string; web: string; phone: string };

const EMPTY_COPY: Record<LinksView, EmptyCopy> = {
  all: {
    title: "No links yet",
    web: "Paste a link above to save it. You can sort it later.",
    phone: "Tap + to save a link, or Share → linkables.",
  },
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
};

export function LinksEmpty({ view }: { view: LinksView }) {
  const copy = EMPTY_COPY[view];
  return (
    <div className="flex animate-fade-in flex-col gap-1.5 px-3 py-10 md:gap-2 md:px-3.5 md:py-14">
      <p className="text-[17px] font-bold md:text-xl">{copy.title}</p>
      <p className="max-w-[440px] text-sm leading-normal text-muted-foreground md:text-[14.5px]">
        <span className="md:hidden">{copy.phone}</span>
        <span className="hidden md:inline">{copy.web}</span>
      </p>
    </div>
  );
}
