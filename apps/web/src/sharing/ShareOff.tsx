import type { ListedCollection } from "@linkables/shared/collections";
import { Check, EyeOff, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { coverCells, type CoverCell } from "../collections/cover";

type ShareOffProps = { collection: ListedCollection; pending: boolean; onTurnOn: () => void };

function whatViewersSee(count: number): string {
  const these = count === 1 ? "this link" : `these ${String(count)} links`;
  return `Get a link to this collection. Anyone you send it to can see ${these}, no account needed. They can look, but they can't change anything.`;
}

export function ShareOff({ collection, pending, onTurnOn }: ShareOffProps) {
  return (
    <>
      <div className="flex animate-fade-in flex-col gap-3.5 rounded-2xl bg-muted p-4">
        <div aria-hidden className="grid grid-cols-4 gap-1.5">
          {coverCells(collection.name, collection.cover).map((cell, index) => (
            <PreviewThumb key={index} cell={cell} />
          ))}
        </div>
        <p className="text-[14.5px] leading-normal text-[#d6d5d0]">{whatViewersSee(collection.linkCount)}</p>
        <ul className="flex flex-col gap-2 text-[13.5px] text-muted-foreground">
          <li className="flex items-center gap-2.5">
            <Check aria-hidden strokeWidth={2.4} className="size-[15px] shrink-0 text-primary" />
            Titles, images and descriptions
          </li>
          <li className="flex items-center gap-2.5">
            <EyeOff aria-hidden className="size-[15px] shrink-0 text-subtle-foreground" />
            Never your notes, pins or name
          </li>
        </ul>
      </div>
      {/* Not disabled while pending, so the button keeps its lime behind the spinner. */}
      <Button
        aria-busy={pending}
        onClick={() => { if (!pending) onTurnOn(); }}
        className="h-[50px] w-full gap-2 px-[18px] text-[15.5px]"
      >
        {pending ? <LoaderCircle aria-hidden className="animate-spin" /> : null}
        {pending ? "Making link…" : "Get share link"}
      </Button>
    </>
  );
}

function PreviewThumb({ cell }: { cell: CoverCell }) {
  const [failed, setFailed] = useState(false);
  const frame = "aspect-[16/10] overflow-hidden rounded-lg bg-[#222]";
  if (cell.kind === "fill") return <span className={frame} style={{ background: cell.background }} />;
  return (
    <span className={frame}>
      {failed ? null : (
        <img
          src={cell.src}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => { setFailed(true); }}
          className="size-full object-cover"
        />
      )}
    </span>
  );
}
