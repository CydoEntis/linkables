export const APP_BOOT_ATTRIBUTE = "data-app-boot";

type PageLocation = { hash: string; search: string };

// Inlined into the prerendered landing page's <head>, where it runs before the
// body paints. The app takes over from the landing page when:
// - a Supabase session is stored (supabase-js's sb-<project>-auth-token key;
//   -code-verifier is a pending sign-in, not a session), so a signed-in user
//   never sees the landing page;
// - the URL is a sign-in return (the same params as auth/sign-in-return.ts,
//   plus a PKCE code), so the app can read the tokens or show the error.
// Blocked storage throws a SecurityError; that visitor has no session to find.
// It is serialised with toString(), so it must not reference anything outside
// its body, and it keeps no comments inside, which toString() would inline.
// A future Content-Security-Policy must allow this script by its hash.
export function bootAppIfNeeded(entrySrc: string, doc: Document, storage: Storage, location: PageLocation): boolean {
  const returnKeys = ["access_token", "error", "error_code", "error_description", "code"];
  const hash = new URLSearchParams(location.hash.slice(1));
  const query = new URLSearchParams(location.search);
  let boot = returnKeys.some((key) => hash.has(key) || query.has(key));
  if (!boot) {
    try {
      boot = Object.keys(storage).some((key) => /^sb-.+-auth-token$/.test(key));
    } catch (error) {
      if (!(error instanceof DOMException)) throw error;
    }
  }
  if (!boot) return false;
  doc.documentElement.setAttribute("data-app-boot", "");
  const script = doc.createElement("script");
  script.type = "module";
  script.src = entrySrc;
  doc.head.appendChild(script);
  return true;
}

export function bootScript(entrySrc: string): string {
  // < is escaped so a src can never close the inline <script>.
  const src = JSON.stringify(entrySrc).replace(/</g, "\\u003c");
  return `(${bootAppIfNeeded.toString()})(${src},document,window.localStorage,window.location)`;
}
