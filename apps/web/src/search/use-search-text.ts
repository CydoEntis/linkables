import { useEffect, useEffectEvent, useRef } from "react";

export const SEARCH_DEBOUNCE_MS = 200;

type SearchTextOptions = {
  // The search in the URL, and how to change it.
  query: string | undefined;
  onQueryChange: (query: string | undefined) => void;
  text: string;
  setText: (text: string) => void;
  // What the field's text searches for; undefined for no search.
  toQuery?: (text: string) => string | undefined;
};

const trimmed = (text: string) => text.trim() || undefined;

// Typing reaches the URL once it pauses; a search changed elsewhere (Back, a
// cleared chip, the command palette) comes back into the field.
export function useSearchText({ query, onQueryChange, text, setText, toQuery = trimmed }: SearchTextOptions) {
  // null until the field first takes the URL's search, on mount.
  const sent = useRef<string | undefined | null>(null);
  const target = toQuery(text);
  const send = useEffectEvent((next: string | undefined) => {
    sent.current = next;
    onQueryChange(next);
  });
  const follow = useEffectEvent((next: string | undefined) => {
    sent.current = next;
    setText(next ?? "");
  });

  useEffect(() => {
    if (query !== sent.current) follow(query);
  }, [query]);

  useEffect(() => {
    if (target === sent.current) return;
    const timer = setTimeout(() => { send(target); }, SEARCH_DEBOUNCE_MS);
    return () => { clearTimeout(timer); };
  }, [target]);

  return {
    // Enter searches at once instead of waiting for the pause.
    flush: () => { if (target !== sent.current) send(target); },
    clear: () => {
      setText("");
      if (sent.current !== undefined) send(undefined);
    },
  };
}
