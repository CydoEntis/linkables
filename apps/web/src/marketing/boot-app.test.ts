import { afterEach, expect, it } from "vitest";
import { APP_BOOT_ATTRIBUTE, bootAppIfSignedIn, bootScript } from "./boot-app";

const ENTRY = "/assets/index-abc123.js";

function appScripts() {
  return [...document.head.querySelectorAll("script[type=module]")].map((script) => script.getAttribute("src"));
}

afterEach(() => {
  localStorage.clear();
  document.head.innerHTML = "";
  document.documentElement.removeAttribute(APP_BOOT_ATTRIBUTE);
});

it("loads the app and hides the landing page when a session is stored", () => {
  localStorage.setItem("sb-abcdefgh-auth-token", "{}");
  expect(bootAppIfSignedIn(ENTRY, document, localStorage)).toBe(true);
  expect(document.documentElement.hasAttribute(APP_BOOT_ATTRIBUTE)).toBe(true);
  expect(appScripts()).toEqual([ENTRY]);
});

it("leaves the landing page alone for a visitor without a session", () => {
  localStorage.setItem("unrelated", "1");
  expect(bootAppIfSignedIn(ENTRY, document, localStorage)).toBe(false);
  expect(document.documentElement.hasAttribute(APP_BOOT_ATTRIBUTE)).toBe(false);
  expect(appScripts()).toEqual([]);
});

it("does not mistake a pending sign-in's code verifier for a session", () => {
  localStorage.setItem("sb-abcdefgh-auth-token-code-verifier", "x");
  expect(bootAppIfSignedIn(ENTRY, document, localStorage)).toBe(false);
});

it("still works once serialised into the inline script", () => {
  localStorage.setItem("sb-abcdefgh-auth-token", "{}");
  const inline = document.createElement("script");
  inline.textContent = bootScript(ENTRY);
  document.body.appendChild(inline);
  inline.remove();
  expect(appScripts()).toEqual([ENTRY]);
});

it("cannot close its inline script tag", () => {
  expect(bootScript("/a</script><b>.js")).not.toContain("</script>");
});
