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

// The API caps request bodies at 16 KB. A full note and title in 4-byte
// characters come to about 15.3 KB of JSON, so the field cap is the limit users hit.
export const NOTE_MAX = 3500;

// Never stored, whether a user typed it or a page supplied it: control characters
// other than whitespace (Postgres text rejects NUL), bidi overrides and isolates,
// which can make a title display reversed or spoofed, and lone surrogates.
export const UNSAFE_TEXT_CHARS = /(?![\t\n\v\f\r])\p{Cc}|[\u202A-\u202E\u2066-\u2069]|\p{Cs}/u;
