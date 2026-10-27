import { describe, expect, it } from "vitest";
import { sharedShellHtml } from "./shared-shell";

const INDEX = `<!doctype html>
<html lang="en" class="dark">
  <head>
    <meta name="robots" content="noindex" />
    <title>linkables</title>
  </head>
  <body><div id="root"></div></body>
</html>`;

describe("sharedShellHtml", () => {
  it("gives the app shell the shared collection link preview", () => {
    const html = sharedShellHtml(INDEX);

    expect(html).toContain(`<meta property="og:image" content="https://linkables.app/social/shared-collection.png">`);
    expect(html).toContain(`<meta property="og:title" content="A shared collection on linkables">`);
    expect(html).toContain(`<meta name="twitter:card" content="summary_large_image">`);
    expect(html).toContain(`<div id="root"></div>`);
  });

  it("asks crawlers not to index the page or follow its links", () => {
    expect(sharedShellHtml(INDEX)).toContain(`<meta name="robots" content="noindex, nofollow" />`);
  });

  it("never names the page's own address, which holds the token", () => {
    expect(sharedShellHtml(INDEX)).not.toContain("og:url");
  });
});
