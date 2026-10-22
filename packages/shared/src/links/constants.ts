export const URL_MAX_LENGTH = 2048;

export const RESOURCE_KINDS = ["video", "page", "other"] as const;

export const FETCH_STATUSES = ["pending", "fetched", "fetch_failed"] as const;

export const LINK_VIEWS = ["all", "inbox"] as const;

export const LIST_LIMIT_DEFAULT = 50;

export const LIST_LIMIT_MAX = 100;

export const SEARCH_QUERY_MAX_LENGTH = 200;
// Matches the cap on extracted titles, so an override is never longer than a fetched title.
export const TITLE_OVERRIDE_MAX = 300;
// One cap for fetched titles and title overrides. Caps count code points.
export const TITLE_MAX = 300;

// The API caps request bodies at 16 KB. At 3 UTF-8 bytes per character, a full
// note plus a full title still fits, so the field cap is the limit users hit.
export const NOTE_MAX = 5000;
