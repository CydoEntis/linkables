import type { SavedLink } from "@linkables/shared/links";
import { Check } from "lucide-react";
import type { KeyboardEvent, MouseEvent } from "react";
import { cn } from "cn";
import { useSelection } from "./selection-store";

type Selectable = {
  selecting: boolean;
  selected: boolean;
  // Spread on the row's link: in select mode it is a checkbox that toggles instead of opening.
  anchorProps: {
    href?: undefined;
    tabIndex?: 0;
    role?: "checkbox";
    "aria-checked"?: boolean;
    onClick?: (event: MouseEvent) => void;
    onKeyDown?: (event: KeyboardEvent) => void;
  };
};

export function useSelectable(link: SavedLink): Selectable {
  const selecting = useSelection((state) => state.selecting);
  const selected = useSelection((state) => link.id in state.chosen);
  if (!selecting) return { selecting, selected, anchorProps: {} };
  const toggle = () => { useSelection.getState().toggle(link); };
  return {
    selecting,
    selected,
    anchorProps: {
      href: undefined,
      tabIndex: 0,
      role: "checkbox",
      "aria-checked": selected,
      onClick: (event) => {
        event.preventDefault();
        toggle();
      },
      onKeyDown: (event) => {
        if (event.key !== " ") return;
        event.preventDefault();
        toggle();
      },
    },
  };
}

export function SelectBox({ selected, className }: { selected: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-[22px] shrink-0 items-center justify-center rounded-md border-2 transition-colors",
        selected ? "border-primary bg-primary text-primary-foreground" : "border-line-strong bg-card",
        className,
      )}
    >
      {selected ? <Check strokeWidth={3} className="size-3.5" /> : null}
    </span>
  );
}
