import type { SavedLink } from "@linkables/shared/links";
import type { resource, savedLink } from "../db/schema";

export function toSavedLink(link: typeof savedLink.$inferSelect, res: typeof resource.$inferSelect): SavedLink {
  return {
    id: link.id,
    originalUrl: link.originalUrl,
    titleOverride: link.titleOverride,
    note: link.note,
    pinned: link.pinned,
    savedAt: link.savedAt.toISOString(),
    resource: {
      id: res.id,
      canonicalUrl: res.canonicalUrl,
      title: res.title,
      description: res.description,
      author: res.author,
      faviconUrl: res.faviconUrl,
      thumbnailUrl: res.thumbnailUrl,
      kind: res.kind,
      fetchStatus: res.fetchStatus,
    },
  };
}
