// The public half of the key pair that fixes the extension id, so the id (and the
// chrome-extension:// origin the API allows) is the same on every install, unpacked
// or packed. The private half is never committed; see README.md.
export const MANIFEST_KEY =
  "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAsOoIr5EpDBdYdH8X6+Dh03l7nZT1Q0FjMBtME3muS6/WyvrGm/lyzTbbkcLikq9vDo6LkRt4ffT4+yb6u8fRXmoNTzju6xLEAnQmEc4SC0t06OH1AIle1HTCHNVe15ZUJ7uD72XqN3zUtmjaKsBx9fV0Aw74s5dHDQXcAlUhEvzIb0XH+fnKRt1f1LCapvVSAJZK6VVFDs3EY5QQR6fR3uw0LVAHPa6ga/iVXB4vLwXlb9Fj+v8I5vdhie26yyP0JsaLevBnne+/+aU4q2e9fJn4jXgCqmG0sq9pcEwRTfFd2ZV3Q7HhKs9JOQTdV5OG5Lk7+eUyZC5pJeHO0w2whQIDAQAB";

export const EXTENSION_ID = "ekgbmopoceccloaibfknnbnohkpbkili";

// Chrome's rule: the first 32 hex digits of SHA-256 over the key, with 0-f spelled a-p.
export async function extensionIdFor(key: string): Promise<string> {
  const der = Uint8Array.from(atob(key), (char) => char.charCodeAt(0));
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", der));
  const hex = Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 32);
  return Array.from(hex, (digit) => String.fromCharCode(97 + parseInt(digit, 16))).join("");
}

// store: the Chrome Web Store build. The store refuses an uploaded `key` and assigns its own id.
type ManifestOptions = { version: string; appUrl: string; supabaseUrl: string; store?: boolean };

const hostPattern = (origin: string) => `${origin.replace(/\/+$/, "")}/*`;

export function buildManifest({ version, appUrl, supabaseUrl, store = false }: ManifestOptions) {
  return {
    manifest_version: 3,
    name: "linkables",
    // Also the Web Store listing's summary, which allows 132 characters.
    description: "Save the page you're on to linkables in one click, then pin it or file it in a collection. Private beta, sign-in required.",
    version,
    ...(store ? {} : { key: MANIFEST_KEY }),
    // activeTab reads the current tab's address only when the toolbar button is clicked.
    permissions: ["activeTab", "storage"],
    host_permissions: [hostPattern(appUrl), hostPattern(supabaseUrl)],
    action: {
      default_title: "Save to linkables",
      default_popup: "popup.html",
      default_icon: { "16": "icon-16.png", "32": "icon-32.png" },
    },
    // Drawn at each size by store/render.ts, so Chrome never scales one.
    icons: { "16": "icon-16.png", "32": "icon-32.png", "48": "icon-48.png", "128": "icon-128.png" },
  };
}
