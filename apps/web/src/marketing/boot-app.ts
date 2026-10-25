export const APP_BOOT_ATTRIBUTE = "data-app-boot";

// Inlined into the prerendered landing page's <head>, where it runs before the
// body paints: a stored Supabase session hides the landing page and loads the
// app instead, so a signed-in user never sees it. It is serialised with
// toString(), so it must not reference anything outside its own body.
export function bootAppIfSignedIn(entrySrc: string, doc: Document, storage: Storage): boolean {
  let signedIn = false;
  try {
    // supabase-js's default key is sb-<project>-auth-token; -code-verifier is not a session.
    signedIn = Object.keys(storage).some((key) => /^sb-.+-auth-token$/.test(key));
  } catch (error) {
    // Blocked storage throws a SecurityError; that visitor has no session to find.
    if (!(error instanceof DOMException)) throw error;
  }
  if (!signedIn) return false;
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
  return `(${bootAppIfSignedIn.toString()})(${src},document,window.localStorage)`;
}
