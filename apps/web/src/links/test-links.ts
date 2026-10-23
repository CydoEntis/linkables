import type { ResourceSummary, SavedLink } from "@linkables/shared/links";

type SavedLinkOverrides = Partial<Omit<SavedLink, "resource">> & { resource?: Partial<ResourceSummary> };

export function savedLink({ resource, ...link }: SavedLinkOverrides = {}): SavedLink {
  return {
    id: crypto.randomUUID(),
    originalUrl: "https://example.com/article",
    titleOverride: null,
    note: null,
    pinned: false,
    savedAt: new Date().toISOString(),
    ...link,
    resource: {
      id: crypto.randomUUID(),
      canonicalUrl: "https://example.com/article",
      title: "An example article",
      description: null,
      author: null,
      faviconUrl: null,
      thumbnailUrl: null,
      kind: "page",
      fetchStatus: "fetched",
      ...resource,
    },
  };
}
