import type { SaveLinkResponse } from "@linkables/shared/links";
import { ApiError, NETWORK_ERROR } from "@linkables/shared/api-client";
import { NO_SESSION } from "../api/client";
import { savablePage } from "./savable";

export const SAVE_MESSAGES = {
  offline: "You're offline. Check your connection and try again.",
  noSession: "Couldn't check your sign-in. Try again in a moment.",
  rateLimited: "You're saving very fast. Wait a minute, then try again.",
  refused: "linkables can't save this page's address.",
  failed: "Something went wrong. Try again.",
} as const;

export type SaveRequest = { url: string; source: "extension" };

export type SaveOutcome =
  | { status: "saved"; link: SaveLinkResponse; pageTitle: string | null }
  | { status: "cant"; reason: string }
  | { status: "error"; message: string };

type SaveDeps = {
  readTab: () => Promise<{ url?: string | undefined; title?: string | undefined }>;
  save: (request: SaveRequest) => Promise<SaveLinkResponse>;
};

// The API answers a page saved before with that link and duplicate: true, so one
// request covers both Saved and Already saved.
export async function saveCurrentTab({ readTab, save }: SaveDeps): Promise<SaveOutcome> {
  const page = savablePage(await readTab());
  if (!page.ok) return { status: "cant", reason: page.reason };
  try {
    return { status: "saved", link: await save({ url: page.url, source: "extension" }), pageTitle: page.title };
  } catch (error) {
    if (error instanceof ApiError) return { status: "error", message: saveErrorMessage(error) };
    throw error;
  }
}

function saveErrorMessage(error: ApiError): string {
  if (error.code === NETWORK_ERROR) return SAVE_MESSAGES.offline;
  if (error.code === NO_SESSION) return SAVE_MESSAGES.noSession;
  if (error.code === "RATE_LIMIT") return SAVE_MESSAGES.rateLimited;
  if (error.code === "VALIDATION") return SAVE_MESSAGES.refused;
  return SAVE_MESSAGES.failed;
}

// A new link's own title arrives only after the metadata fetch, so the tab's title stands in.
export function savedTitle(link: SaveLinkResponse, pageTitle: string | null): string {
  return link.titleOverride ?? link.resource.title ?? pageTitle ?? link.originalUrl;
}
