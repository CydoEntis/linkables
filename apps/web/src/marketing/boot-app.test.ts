import { afterEach, expect, it } from "vitest";
import { APP_BOOT_ATTRIBUTE, bootAppIfNeeded, bootScript } from "./boot-app";

const ENTRY = "/assets/index-abc123.js";
const PLAIN = { hash: "", search: "" };

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
  expect(bootAppIfNeeded(ENTRY, document, localStorage, PLAIN)).toBe(true);
  expect(document.documentElement.hasAttribute(APP_BOOT_ATTRIBUTE)).toBe(true);
  expect(appScripts()).toEqual([ENTRY]);
});

it("leaves the landing page alone for a visitor without a session", () => {
  localStorage.setItem("unrelated", "1");
  expect(bootAppIfNeeded(ENTRY, document, localStorage, PLAIN)).toBe(false);
  expect(document.documentElement.hasAttribute(APP_BOOT_ATTRIBUTE)).toBe(false);
  expect(appScripts()).toEqual([]);
});

it("does not mistake a pending sign-in's code verifier for a session", () => {
  localStorage.setItem("sb-abcdefgh-auth-token-code-verifier", "x");
  expect(bootAppIfNeeded(ENTRY, document, localStorage, PLAIN)).toBe(false);
});

it.each([
  ["an email link's tokens in the hash", { hash: "#access_token=a&refresh_token=b", search: "" }],
  ["an expired email link's error in the hash", { hash: "#error=access_denied&error_code=otp_expired", search: "" }],
  ["an error description alone", { hash: "#error_description=Email+link+is+invalid", search: "" }],
  ["a Google failure in the query", { hash: "", search: "?error=server_error" }],
  ["an error code in the query", { hash: "", search: "?error_code=bad_oauth_state" }],
  ["a PKCE code in the query", { hash: "", search: "?code=abc" }],
])("loads the app for a visitor coming back from sign-in with %s", (_, location) => {
  expect(bootAppIfNeeded(ENTRY, document, localStorage, location)).toBe(true);
  expect(appScripts()).toEqual([ENTRY]);
});

it("ignores unrelated query and hash values", () => {
  expect(bootAppIfNeeded(ENTRY, document, localStorage, { hash: "#faq", search: "?ref=x" })).toBe(false);
});

it("still works once serialised into the inline script", () => {
  localStorage.setItem("sb-abcdefgh-auth-token", "{}");
  const inline = document.createElement("script");
  inline.textContent = bootScript(ENTRY);
  document.body.appendChild(inline);
  inline.remove();
  expect(appScripts()).toEqual([ENTRY]);
});

it("inlines no comments", () => {
  const script = bootScript(ENTRY);
  expect(script).not.toContain("//");
  expect(script).not.toContain("/*");
});

it("cannot close its inline script tag", () => {
  expect(bootScript("/a</script><b>.js")).not.toContain("</script>");
});
