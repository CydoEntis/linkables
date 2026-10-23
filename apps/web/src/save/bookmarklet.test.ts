import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { buildBookmarklet } from "./bookmarklet";

const ORIGIN = "https://linkables.test";
const PAGE = "https://news.test/a b?x=1&y=2#part";

type Opened = { url: string; name: string; features: string };

// Runs the bookmarklet as a browser would, in a context holding only a fake
// `window` and `location`, and records every property the code touches.
function clickOn(pageUrl: string, { popupBlocked = false } = {}) {
  const touched: string[] = [];
  const opened: Opened[] = [];
  const location = { href: pageUrl };
  const window = {
    open(url: string, name: string, features: string) {
      opened.push({ url, name, features });
      return popupBlocked ? null : {};
    },
  };
  const watch = <T extends object>(label: string, target: T) =>
    new Proxy(target, {
      get(object, key, receiver) {
        touched.push(`get ${label}.${String(key)}`);
        return Reflect.get(object, key, receiver);
      },
      set(object, key, value, receiver) {
        touched.push(`set ${label}.${String(key)}`);
        return Reflect.set(object, key, value, receiver);
      },
    });
  const code = decodeURIComponent(buildBookmarklet(ORIGIN).slice("javascript:".length));
  runInNewContext(code, { window: watch("window", window), location: watch("location", location) });
  return { touched, opened, location };
}

describe("buildBookmarklet", () => {
  it("returns a javascript: link", () => {
    expect(buildBookmarklet(ORIGIN)).toMatch(/^javascript:/);
  });

  it("points at the app's own /save page", () => {
    expect(buildBookmarklet(ORIGIN)).toContain(`${ORIGIN}/save?url=`);
  });

  it("opens /save in a small named window with the page URL encoded so it parses back intact", () => {
    const { opened } = clickOn(PAGE);
    expect(opened).toHaveLength(1);
    const [{ url, name, features }] = opened as [Opened];
    expect(name).toBe("linkables-save");
    expect(features).toBe("width=420,height=640");
    const target = new URL(url);
    expect(target.origin + target.pathname).toBe(`${ORIGIN}/save`);
    expect(target.searchParams.get("url")).toBe(PAGE);
    expect([...target.searchParams.keys()]).toEqual(["url"]);
  });

  it("reads only location.href and calls only window.open", () => {
    expect(clickOn(PAGE).touched).toEqual(["get location.href", "get window.open"]);
  });

  it("goes to /save in the same tab when the popup is blocked", () => {
    const { touched, location } = clickOn(PAGE, { popupBlocked: true });
    expect(new URL(location.href).searchParams.get("url")).toBe(PAGE);
    expect(touched).toEqual(["get location.href", "get window.open", "set location.href"]);
  });
});
