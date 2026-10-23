import { Menu as MenuPrimitive } from "@base-ui/react/menu"
import { cn } from "cn"

function DropdownMenu({ ...props }: MenuPrimitive.Root.Props) {
  return <MenuPrimitive.Root data-slot="dropdown-menu" {...props} />
}

function DropdownMenuTrigger({ ...props }: MenuPrimitive.Trigger.Props) {
  return <MenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />
}

function DropdownMenuContent({
  align = "start",
  side = "bottom",
  sideOffset = 8,
  className,
  ...props
}: MenuPrimitive.Popup.Props & Pick<MenuPrimitive.Positioner.Props, "align" | "side" | "sideOffset">) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner className="isolate z-50 outline-none" align={align} side={side} sideOffset={sideOffset}>
        <MenuPrimitive.Popup
          data-slot="dropdown-menu-content"
          className={cn(
            "min-w-56 origin-(--transform-origin) rounded-xl bg-popover p-1.5 text-popover-foreground shadow-float outline-none transition-opacity duration-100 data-ending-style:opacity-0 data-starting-style:opacity-0",
            className
          )}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  )
}

// The highlight background is too close to the popup to show focus on its own,
// so the highlighted item also gets the 2 px lime ring.
function DropdownMenuItem({ className, ...props }: MenuPrimitive.Item.Props) {
  return (
    <MenuPrimitive.Item
      data-slot="dropdown-menu-item"
      className={cn(
        "flex h-11 cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-sm font-semibold outline-none select-none data-highlighted:bg-muted data-highlighted:outline-2 data-highlighted:-outline-offset-2 data-highlighted:outline-ring data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem }
