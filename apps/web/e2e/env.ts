// Unusual ports so the suite never lands on a dev server already running.
// E2E_API_PORT / E2E_WEB_PORT let parallel checkouts run the suite side by side.
export const API_URL = `http://127.0.0.1:${process.env.E2E_API_PORT ?? "3260"}`;
export const WEB_URL = `http://127.0.0.1:${process.env.E2E_WEB_PORT ?? "5260"}`;

// Never contacted: the fixture blocks this origin. It only has to match between
// the web build (storage key), the API (token issuer) and the minted tokens.
export const SUPABASE_URL = "http://dummy.test";
