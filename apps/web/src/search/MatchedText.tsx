export type TextPart = { text: string; match: boolean };

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// The words the API matches on: quotes are dropped, and "-word" (exclude) and
// "or" are search syntax, not words to find.
function searchTerms(query: string): string[] {
  return query
    .replaceAll('"', " ")
    .split(/\s+/)
    .filter((term) => term !== "" && !term.startsWith("-") && term.toLowerCase() !== "or")
    .sort((a, b) => b.length - a.length);
}

// Splits text into matched and unmatched parts, ignoring case. A regex with the
// u flag keeps offsets right where lower-casing would change a string's length.
export function highlightParts(text: string, query: string | undefined): TextPart[] {
  const terms = query === undefined ? [] : searchTerms(query);
  if (terms.length === 0 || text === "") return [{ text, match: false }];
  const pattern = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "giu");
  // split with one capture group alternates unmatched (even) and matched (odd) parts.
  return text
    .split(pattern)
    .map((part, index) => ({ text: part, match: index % 2 === 1 }))
    .filter((part) => part.text !== "");
}

// Text nodes only, so a title can never inject markup.
export function MatchedText({ text, query }: { text: string; query: string | undefined }) {
  return highlightParts(text, query).map((part, index) =>
    part.match ? (
      <mark key={index} className="rounded-[3px] bg-primary text-primary-foreground">
        {part.text}
      </mark>
    ) : (
      part.text
    ),
  );
}
