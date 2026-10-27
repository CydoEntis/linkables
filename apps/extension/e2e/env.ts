import { fileURLToPath } from "node:url";

// Not the web suite's ports, so both suites can run at once. E2E_EXTENSION_API_PORT
// and E2E_EXTENSION_APP_PORT let parallel checkouts run it side by side.
export const API_URL = `http://127.0.0.1:${process.env.E2E_EXTENSION_API_PORT ?? "3270"}`;

// The web app, with /api passed on to API_URL, as linkables.app serves both.
// The extension is built for this origin: its content script runs here.
export const APP_URL = `http://127.0.0.1:${process.env.E2E_EXTENSION_APP_PORT ?? "3271"}`;

// Never contacted: the tests answer or block this origin. It only has to match
// between the extension build, the API (token issuer) and the minted tokens.
export const SUPABASE_URL = "http://dummy.test";

// The unpacked extension the suite builds and loads.
export const EXTENSION_DIR = fileURLToPath(new URL("./dist", import.meta.url));
