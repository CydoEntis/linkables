import { Autocomplete } from "@base-ui/react/autocomplete";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useRef, useState } from "react";
import { displayName } from "../collections/display-name";
import { useCollections } from "../collections/use-collections";
import { LINKS_VIEWS, VIEW_LABELS } from "../links/links-search";
import { useLinksUi } from "../links/links-ui-store";
import { focusSearchField } from "./use-list-shortcuts";

// What gets focus once the palette has closed: an element, the palette's
// trigger (true), or nothing because another dialog takes over (false).
type AfterClose = () => HTMLElement | boolean;

export type Command = { value: string; label: string; run: () => AfterClose };
type CommandGroup = { value: string; items: Command[] };

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSearch: (query: string) => void;
  onBookmarklet: () => void;
  onShortcuts: () => void;
};

// The search command carries the typed text, so it always matches.
export function commandMatches(command: Command, query: string): boolean {
  return command.value === "search-for" || command.label.toLowerCase().includes(query.trim().toLowerCase());
}

const toTrigger: AfterClose = () => true;
const toNothing: AfterClose = () => false;

// The bar takes a link to save; on a phone, where the bar is hidden, the save sheet opens.
function focusSaveField(): AfterClose {
  const bar = document.querySelector<HTMLInputElement>("[data-save-field]");
  if (bar?.checkVisibility()) return () => bar;
  useLinksUi.getState().setSaveSheetOpen(true);
  return toNothing;
}

function useCommands({ onSearch, onBookmarklet, onShortcuts }: Pick<CommandPaletteProps, "onSearch" | "onBookmarklet" | "onShortcuts">, text: string) {
  const navigate = useNavigate();
  const collections = useCollections();
  const query = text.trim();

  const actions: Command[] = [
    query
      ? { value: "search-for", label: `Search links for “${query}”`, run: () => { onSearch(query); return toTrigger; } }
      : { value: "search", label: "Search links", run: () => () => focusSearchField() ?? true },
    { value: "save", label: "Save a link", run: focusSaveField },
    { value: "bookmarklet", label: "Get the bookmark button", run: () => { onBookmarklet(); return toNothing; } },
    { value: "shortcuts", label: "Keyboard shortcuts", run: () => { onShortcuts(); return toNothing; } },
  ];
  const views: Command[] = LINKS_VIEWS.map((view) => ({
    value: `view-${view}`,
    label: `Go to ${VIEW_LABELS[view]}`,
    run: () => { void navigate({ to: "/", search: { view } }); return toTrigger; },
  }));
  const places: Command[] = (collections.data ?? []).map((collection) => ({
    value: `collection-${collection.id}`,
    label: `Go to ${displayName(collection.name)}`,
    run: () => { void navigate({ to: "/c/$collectionId", params: { collectionId: collection.id } }); return toTrigger; },
  }));
  const groups: CommandGroup[] = [
    { value: "Actions", items: actions },
    { value: "Go to", items: views },
    { value: "Collections", items: places },
  ];
  return groups.filter((group) => group.items.length > 0);
}

// Cmd/Ctrl+K: Base UI's inline autocomplete in a dialog, its documented command palette pattern.
export function CommandPalette({ open, onOpenChange, ...handlers }: CommandPaletteProps) {
  const [text, setText] = useState("");
  const afterClose = useRef<AfterClose>(toTrigger);
  const groups = useCommands(handlers, text);

  function run(command: Command) {
    afterClose.current = command.run();
    onOpenChange(false);
  }

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (next) afterClose.current = toTrigger;
        onOpenChange(next);
      }}
      onOpenChangeComplete={(next) => { if (!next) setText(""); }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-scrim transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <DialogPrimitive.Viewport className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]">
          <DialogPrimitive.Popup
            finalFocus={() => afterClose.current()}
            className="flex max-h-[min(32rem,76vh)] w-full max-w-[560px] flex-col overflow-hidden rounded-[20px] bg-popover text-popover-foreground shadow-float outline-none transition-[opacity,scale] duration-150 data-ending-style:scale-97 data-ending-style:opacity-0 data-starting-style:scale-97 data-starting-style:opacity-0"
          >
            <DialogPrimitive.Title className="sr-only">Command palette</DialogPrimitive.Title>
            <Autocomplete.Root open inline items={groups} value={text} onValueChange={setText} itemToStringValue={(item: Command) => item.label} filter={commandMatches} autoHighlight="always" keepHighlight>
              <label className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-[18px]">
                <Search aria-hidden strokeWidth={2.2} className="size-[17px] shrink-0 text-subtle-foreground" />
                <Autocomplete.Input aria-label="Search commands" placeholder="Type a command or search…" className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-subtle-foreground" />
              </label>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
                <Autocomplete.Empty>
                  <p className="px-3 py-6 text-sm text-muted-foreground">No commands match.</p>
                </Autocomplete.Empty>
                <Autocomplete.List>
                  {(group: CommandGroup) => (
                    <Autocomplete.Group key={group.value} items={group.items} className="not-last:mb-2">
                      <Autocomplete.GroupLabel className="px-3 pt-1 pb-1.5 text-xs font-semibold tracking-[0.02em] text-subtle-foreground">
                        {group.value}
                      </Autocomplete.GroupLabel>
                      <Autocomplete.Collection>
                        {(command: Command) => (
                          <Autocomplete.Item
                            key={command.value}
                            value={command}
                            onClick={() => { run(command); }}
                            className="flex h-11 cursor-pointer items-center rounded-md px-3 text-sm font-semibold outline-none select-none data-highlighted:bg-muted data-highlighted:outline-2 data-highlighted:-outline-offset-2 data-highlighted:outline-ring"
                          >
                            <span className="truncate">{command.label}</span>
                          </Autocomplete.Item>
                        )}
                      </Autocomplete.Collection>
                    </Autocomplete.Group>
                  )}
                </Autocomplete.List>
              </div>
            </Autocomplete.Root>
          </DialogPrimitive.Popup>
        </DialogPrimitive.Viewport>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
