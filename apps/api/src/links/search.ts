import { and, or, sql, type SQL } from "drizzle-orm";
import { resource, savedLink } from "../db/schema";

// Match the previous English dictionary's unquoted stop-word behavior.
// https://github.com/postgres/postgres/blob/REL_17_STABLE/src/backend/snowball/stopwords/english.stop
const stopWords = new Set(`i me my myself we our ours ourselves you your yours yourself yourselves he him his himself she her hers herself it its itself they them their theirs themselves what which who whom this that these those am is are was were be been being have has had having do does did doing a an the and but if or because as until while of at by for with about against between into through during before after above below to from up down in out on off over under again further then once here there when where why how all any both each few more most other some such no nor not only own same so than too very s t can will just don should now`.split(" "));

type Term = { query: string; excluded: boolean };

function quotedPhrase(token: string): string | undefined {
  const words = token.match(/[\p{L}\p{N}]+/gu) ?? [];
  // Leading and trailing stop words have no positional constraint in the old
  // dictionary. Interior words stay in the phrase to retain their positions.
  while (words[0] !== undefined && stopWords.has(words[0].toLowerCase())) words.shift();
  while (words.at(-1) !== undefined && stopWords.has(words.at(-1)?.toLowerCase() ?? "")) words.pop();
  return words.length === 0 ? undefined : '"' + words.join(" ") + '"';
}

function searchGroups(q: string): Term[][] {
  const groups: Term[][] = [];
  let current: Term[] = [];
  let excluded = false;
  for (const match of q.matchAll(/-|"[^"]*(?:"|$)|[\p{L}\p{N}]+/gu)) {
    const token = match[0];
    if (token === "-") {
      // A hyphen inside a word is punctuation; a leading dash negates the next operand.
      if (!/[\p{L}\p{N}]/u.test(q.slice(match.index - 1, match.index))) excluded = true;
      continue;
    }
    if (token.toLowerCase() === "or" && !excluded) {
      if (current.length > 0) groups.push(current);
      current = [];
      continue;
    }
    const query = token.startsWith('"') ? quotedPhrase(token) : stopWords.has(token.toLowerCase()) ? undefined : '"' + token + '"';
    if (query !== undefined) current.push({ query, excluded });
    excluded = false;
  }
  if (current.length > 0) groups.push(current);
  return groups;
}

function matchesTerm({ query, excluded }: Term): SQL {
  // All operands are quoted and bound; user punctuation can never become FTS syntax.
  const matches = sql`${savedLink.id} in (select link_id from saved_link_search where saved_link_search match ${query})`;
  return excluded ? sql`not (${matches})` : matches;
}

function containsPattern(q: string): string {
  return "%" + q.replace(/[\\%_]/g, "\\$&") + "%";
}

export function matchesSearch(q: string) {
  const groups = searchGroups(q);
  const textMatch = groups.length === 0 ? sql`false` : or(...groups.map((group) => and(...group.map(matchesTerm))));
  const pattern = containsPattern(q);
  return or(
    textMatch,
    sql`${resource.canonicalUrl} like ${pattern} escape '\\'`,
    sql`${savedLink.originalUrl} like ${pattern} escape '\\'`,
  );
}
