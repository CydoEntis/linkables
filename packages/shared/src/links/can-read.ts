import type { SavedLink } from "./types";

// A page may still turn out not to be an article (a shop, a home page); that is
// only known after the reader fetch. An unknown kind (metadata pending) gets the benefit of the doubt.
export function canRead(link: { resource: Pick<SavedLink["resource"], "kind"> }): boolean {
  const { kind } = link.resource;
  return kind === "page" || kind === null;
}
