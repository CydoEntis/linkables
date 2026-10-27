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

// Stable identifier for Mozilla signing.
export const GECKO_ID = "linkables@linkables.app";

// store: the Chrome Web Store build. The store refuses an uploaded `key` and assigns its own id.
type ManifestOptions = { version: string; store?: boolean };



// Both browsers hand this command to the worker. It must stay a different key from
// the side panel's Alt+Shift+L.
const QUIET_SAVE_COMMANDS = {
  "save-quietly": { suggested_key: { default: "Alt+Shift+S" }, description: "Save the current tab quietly, with no pop-up" },
};

// What both browsers' manifests share.
function sharedFields({ version }: Omit<ManifestOptions, "store">) {
  return {
    manifest_version: 3,
    name: "linkables",
    // Also the Web Store listing's summary, which allows 132 characters.
    description: "Save pages to your own Linkables server, then search, organize, and share your collections.",
    version,
    optional_host_permissions: ["https://*/*", "http://localhost/*", "http://127.0.0.1/*", "http://[::1]/*"],
    // Signs the extension in from the app (src/connect). A content script rather than
    // externally_connectable, which Firefox lacks.

    action: {
      default_title: "Save to linkables",
      default_popup: "popup.html",
      default_icon: { "16": "icon-16.png", "32": "icon-32.png" },
    },
    // Drawn at each size by store/render.ts, so the browser never scales one.
    icons: { "16": "icon-16.png", "32": "icon-32.png", "48": "icon-48.png", "128": "icon-128.png" },
    // Requested from the side panel's "Follow the tab you're on", never at install.
    optional_permissions: ["tabs"],
  };
}

export function buildManifest({ store = false, ...options }: ManifestOptions) {
  return {
    ...sharedFields(options),
    ...(store ? {} : { key: MANIFEST_KEY }),
    // Tab access follows explicit browser actions; server access is requested separately.
    permissions: ["activeTab", "storage", "sidePanel", "contextMenus"],
    background: { service_worker: "worker.js", type: "module" },
    // A plain extension page, so Firefox's sidebar_action can load the same file.
    side_panel: { default_path: "sidepanel.html" },
    // Chrome has no built-in command for the side panel, so the worker opens it.
    commands: {
      "open-side-panel": { suggested_key: { default: "Alt+Shift+L" }, description: "Open the linkables side panel" },
      ...QUIET_SAVE_COMMANDS,
    },
  };
}

// The Chrome manifest with what Firefox spells differently: an event page for the
// worker, a sidebar for the side panel (opened by its own shortcut command), a
// gecko id instead of `key`. data_collection_permissions are required by AMO from
// Firefox 140 (Android 142).
export function buildFirefoxManifest(options: Omit<ManifestOptions, "store">) {
  return {
    ...sharedFields(options),
    permissions: ["activeTab", "storage", "contextMenus"],
    background: { scripts: ["worker.js"], type: "module" },
    sidebar_action: {
      default_panel: "sidepanel.html",
      default_title: "linkables",
      default_icon: { "16": "icon-16.png", "32": "icon-32.png" },
    },
    commands: {
      _execute_sidebar_action: { suggested_key: { default: "Alt+Shift+L" } },
      ...QUIET_SAVE_COMMANDS,
    },
    browser_specific_settings: {
      gecko: {
        id: GECKO_ID,
        strict_min_version: "140.0",
        // Same data the Chrome listing declares in store/privacy-practices.md.
        data_collection_permissions: { required: ["authenticationInfo", "personallyIdentifyingInfo", "browsingActivity"] },
      },
      gecko_android: { strict_min_version: "142.0" },
    },
  };
}

