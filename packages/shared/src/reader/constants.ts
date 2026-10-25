export const READER_STATUSES = ["ok", "unavailable"] as const;

export const HEADING_LEVELS = [2, 3, 4] as const;

// A readable copy is shared by everyone who saved the page, so it is bounded:
// a page past either cap keeps its start and is marked truncated.
export const READER_BLOCKS_MAX = 1500;
export const READER_TEXT_MAX = 150_000;
