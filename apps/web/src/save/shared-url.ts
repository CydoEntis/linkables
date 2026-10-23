import { canonicalize } from "@linkables/shared/url";

export type SharedFields = { url?: string | undefined; text?: string | undefined; title?: string | undefined };

const HTTP_URL = /https?:\/\/[^\s<>"'“”‘’]+/gi;
const TRAILING_PUNCTUATION = /[.,;:!?)\]}]+$/;

// "(see https://x.test/p)." ends in punctuation; ".../Kangaroo_(film)" ends in its own bracket.
function trimTrailing(candidate: string): string {
  let url = candidate;
  while (TRAILING_PUNCTUATION.test(url)) {
    const last = url.at(-1);
    if (last === ")" && countOf(url, "(") >= countOf(url, ")")) break;
    url = url.slice(0, -1);
  }
  return url;
}

function countOf(text: string, char: string): number {
  return text.split(char).length - 1;
}

function firstHttpUrl(text: string | undefined): string | null {
  for (const [match] of (text ?? "").matchAll(HTTP_URL)) {
    const url = trimTrailing(match);
    if (canonicalize(url).ok) return url;
  }
  return null;
}

// Share targets put the link in different fields: Android usually inside text,
// some apps in title. Only http(s) URLs ever come out.
export function extractSharedUrl({ url, text, title }: SharedFields): string | null {
  return firstHttpUrl(url) ?? firstHttpUrl(text) ?? firstHttpUrl(title);
}
