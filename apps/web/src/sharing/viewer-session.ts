import { viewerSessionSchema, type ViewerSession } from "@linkables/shared/sharing";

const keyOf = (token: string) => `linkables.viewer.${token}`;

// Also kept in memory, so storage that refuses the write still lets the viewer in for the visit.
const thisVisit = new Map<string, ViewerSession>();

function readStored(token: string): ViewerSession | undefined {
  try {
    const raw = localStorage.getItem(keyOf(token));
    if (raw === null) return undefined;
    return viewerSessionSchema.safeParse(JSON.parse(raw)).data;
  } catch (error) {
    // A blocked store or a value some other script left behind: the viewer just signs in again.
    if (error instanceof DOMException || error instanceof SyntaxError) return undefined;
    throw error;
  }
}

// The session the viewer earned for this collection, while it still has time left.
export function viewerSessionFor(token: string, now = Date.now()): string | undefined {
  const held = thisVisit.get(token) ?? readStored(token);
  return held !== undefined && Date.parse(held.expiresAt) > now ? held.session : undefined;
}

export function rememberViewerSession(token: string, session: ViewerSession): void {
  thisVisit.set(token, session);
  try {
    localStorage.setItem(keyOf(token), JSON.stringify(session));
  } catch (error) {
    if (!(error instanceof DOMException)) throw error;
  }
}

export function forgetViewerSession(token: string): void {
  thisVisit.delete(token);
  try {
    localStorage.removeItem(keyOf(token));
  } catch (error) {
    if (!(error instanceof DOMException)) throw error;
  }
}
