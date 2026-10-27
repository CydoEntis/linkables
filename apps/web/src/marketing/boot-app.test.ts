import { expect, it } from "vitest";
import { bootAppIfNeeded, bootScript } from "./boot-app";

it("opens the self-hosted app without reading session tokens from storage", () => {
  expect(bootAppIfNeeded("/assets/app.js", document)).toBe(true);
  expect(document.head.querySelector('script[src="/assets/app.js"]')).not.toBeNull();
});

it("cannot close its inline script tag", () => {
  expect(bootScript("/a</script><b>.js")).not.toContain("</script>");
});
