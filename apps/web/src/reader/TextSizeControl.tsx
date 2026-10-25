import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";
import { TEXT_SIZES, type TextSize } from "./text-size";

const SIZE_LABELS = ["Smaller text", "Default text", "Larger text"] as const;
const GLYPH_SIZES = ["text-[12px]", "text-[15px]", "text-[18px]"] as const;

type TextSizeProps = { value: TextSize; onChange: (size: TextSize) => void };

// A A A on the bar: the shared Button without its surface, the chosen size raised.
export function TextSizeControl({ value, onChange }: TextSizeProps) {
  return (
    <div role="group" aria-label="Text size" className="flex shrink-0 gap-0.5 rounded-[10px] bg-muted p-[3px]">
      {TEXT_SIZES.map((size) => (
        <Button
          key={size}
          variant="ghost"
          aria-label={SIZE_LABELS[size]}
          aria-pressed={size === value}
          onClick={() => { onChange(size); }}
          className={cn(
            "h-[30px] w-[34px] rounded-[7px] bg-transparent px-0 font-reader font-semibold text-muted-foreground inset-shadow-none hover:bg-muted hover:text-foreground",
            GLYPH_SIZES[size],
            size === value && "bg-accent text-foreground hover:bg-accent",
          )}
        >
          A
        </Button>
      ))}
    </div>
  );
}

// The same choice inside the phone's More menu.
export function TextSizeMenuGroup({ value, onChange }: TextSizeProps) {
  return (
    <DropdownMenuRadioGroup
      aria-label="Text size"
      value={value}
      onValueChange={(size: TextSize) => { onChange(size); }}
    >
      {TEXT_SIZES.map((size) => (
        <DropdownMenuRadioItem key={size} value={size} closeOnClick={false}>
          {SIZE_LABELS[size]}
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  );
}
