import { SAVE_PATH } from "./pending-save";

// The /save page shows its popup layout only in a window with this name.
export const POPUP_NAME = "linkables-save";

// The code runs inside whatever page the user is on, so it reads only
// location.href and adds nothing to that page. No "%" may appear in it:
// browsers percent-decode a javascript: URL before running it.
export function buildBookmarklet(origin: string): string {
  const target = JSON.stringify(`${origin}${SAVE_PATH}?url=`);
  return `javascript:(function(){var u=${target}+encodeURIComponent(location.href);if(!window.open(u,'${POPUP_NAME}','width=420,height=640'))location.href=u})();void(0)`;
}
