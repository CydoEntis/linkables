// Chrome leaves a suggested key unset when another extension holds it, and people
// change keys at chrome://extensions/shortcuts, so the panel shows what is set now.
export function shortcutLabel(commands: readonly chrome.commands.Command[], name: string): string {
  return commands.find((command) => command.name === name)?.shortcut || "Not set";
}
