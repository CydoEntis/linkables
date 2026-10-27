// 24 random bytes (192 bits) as base64url: 32 characters, no padding.
export const SHARE_TOKEN_LENGTH = 32;

// Beta collections are small; past this the page shows the newest filings and says how many there are.
export const SHARED_LINKS_MAX = 500;

export const SHARE_ACCESS_MODES = ["link", "emails"] as const;

// A private share is for a handful of people, and every address is one more mailbox a stranger could ask us to write to.
export const SHARE_EMAILS_MAX = 50;

export const SHARE_EMAIL_MAX_LENGTH = 254;

export const SHARE_CODE_LENGTH = 6;

export const SHARE_CODE_EXPIRY_MINUTES = 10;

// 24 random bytes as base64url, the same shape as a share token.
export const VIEWER_SESSION_LENGTH = 32;

export const VIEWER_SESSION_HEADER = "X-Viewer-Session";
