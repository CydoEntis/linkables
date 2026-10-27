import { SAVE_PATH } from "../save/pending-save";

export function ShortcutGuide({ origin = window.location.origin }: { origin?: string }) {
  const savePrefix = `${new URL(SAVE_PATH, origin).href}?url=`;
  return (
    <ol aria-label="Create the iPhone shortcut" className="flex list-decimal flex-col gap-3 pl-5 text-[14.5px] leading-normal">
      <li>Open Shortcuts, tap <strong>+</strong>, and name the shortcut <strong>Save to linkables</strong>.</li>
      <li>
        Open the shortcut&apos;s Details and turn on <strong>Show in Share Sheet</strong>. Set its accepted input to <strong>URLs</strong> and
        <strong> Safari web pages</strong>. For no input, choose <strong>Get Clipboard</strong> if you also want to save copied links.
      </li>
      <li>
        Add <strong>Get URLs from Input</strong> and choose <strong>Shortcut Input</strong>. Add <strong>Get Item from List</strong> and set it to
        <strong> First Item</strong> from those URLs.
      </li>
      <li>Add <strong>URL Encode</strong>, set it to <strong>Encode</strong>, and use <strong>Item from List</strong> as its input.</li>
      <li>
        Add a <strong>URL</strong> action. Paste this address, then insert the <strong>URL Encoded Text</strong> variable directly after
        <strong> url=</strong>, without a space:
        <code className="mt-2 block select-all rounded-lg bg-muted p-3 break-all text-[13px]">{savePrefix}</code>
      </li>
      <li>
        Add <strong>Open URLs</strong> using the URL from the previous action, then tap <strong>Done</strong>. In Safari or another app, tap
        <strong> Share</strong>, then <strong>Save to linkables</strong>.
      </li>
    </ol>
  );
}
