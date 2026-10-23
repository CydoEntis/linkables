import { Popover as PopoverPrimitive } from "@base-ui/react/popover"
import { cn } from "cn"

function Popover({ ...props }: PopoverPrimitive.Root.Props) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />
}

function PopoverTrigger({ ...props }: PopoverPrimitive.Trigger.Props) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

function PopoverContent({
  align = "end",
  side = "bottom",
  sideOffset = 8,
  className,
  ...props
}: PopoverPrimitive.Popup.Props & Pick<PopoverPrimitive.Positioner.Props, "align" | "side" | "sideOffset">) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner className="isolate z-50 outline-none" align={align} side={side} sideOffset={sideOffset}>
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          className={cn(
            "origin-(--transform-origin) rounded-xl bg-popover p-2 text-popover-foreground shadow-float outline-none transition-[opacity,scale] duration-150 data-ending-style:scale-97 data-ending-style:opacity-0 data-starting-style:scale-97 data-starting-style:opacity-0",
            className
          )}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  )
}

function PopoverTitle({ className, ...props }: PopoverPrimitive.Title.Props) {
  return <PopoverPrimitive.Title data-slot="popover-title" className={cn("text-sm font-semibold", className)} {...props} />
}

export { Popover, PopoverTrigger, PopoverContent, PopoverTitle }
