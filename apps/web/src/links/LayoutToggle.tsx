import { LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLayoutChoice, useListLayout, type ListLayout } from "./list-layout";

const OPTIONS: { layout: ListLayout; label: string; Icon: typeof List }[] = [
  { layout: "grid", label: "Grid", Icon: LayoutGrid },
  { layout: "list", label: "List", Icon: List },
];

// Computers only: phones always show the list.
export function LayoutToggle() {
  const layout = useListLayout();
  const choose = useLayoutChoice((state) => state.choose);
  return (
    <div role="group" aria-label="Layout" className="ml-auto hidden gap-0.5 rounded-[11px] bg-muted p-[3px] md:flex">
      {OPTIONS.map(({ layout: option, label, Icon }) => (
        <Button
          key={option}
          variant="ghost"
          size="sm"
          aria-pressed={layout === option}
          onClick={() => { choose(option); }}
          className="h-[30px] gap-1.5 rounded-lg bg-transparent px-[11px] text-[13px] font-semibold text-muted-foreground inset-shadow-none hover:bg-accent hover:text-foreground aria-pressed:bg-accent aria-pressed:text-foreground"
        >
          <Icon aria-hidden strokeWidth={2.2} className="size-3.5" />
          {label}
        </Button>
      ))}
    </div>
  );
}
