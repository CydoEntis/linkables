import { useQuery } from "@tanstack/react-query";
import { OPEN_SIDE_PANEL_COMMAND } from "./open-side-panel";
import { shortcutLabel } from "./shortcut";

// Read fresh each time: people change keys at chrome://extensions/shortcuts.
export function useShortcut(): string | undefined {
  return useQuery({
    queryKey: ["panel", "shortcut"],
    queryFn: async () => shortcutLabel(await chrome.commands.getAll(), OPEN_SIDE_PANEL_COMMAND),
    staleTime: 0,
  }).data;
}
