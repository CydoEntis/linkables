import { type Token, type TokenHandler, Tokenizer, TokenizerMode } from "parse5";

export interface HeadTag {
  tagName: string;
  attrs: Token.Attribute[];
}

export interface HeadScan {
  tags: HeadTag[];
  titles: string[];
}

const MAX_ATTRS = 32;

const TEXT_MODES = new Map<string, Tokenizer["state"]>([
  ["title", TokenizerMode.RCDATA],
  ["textarea", TokenizerMode.RCDATA],
  ["style", TokenizerMode.RAWTEXT],
  ["xmp", TokenizerMode.RAWTEXT],
  ["iframe", TokenizerMode.RAWTEXT],
  ["noembed", TokenizerMode.RAWTEXT],
  ["noframes", TokenizerMode.RAWTEXT],
  ["script", TokenizerMode.SCRIPT_DATA],
  ["plaintext", TokenizerMode.PLAINTEXT],
]);

const FOREIGN_ROOTS = new Set(["svg", "math"]);

// The HTML spec's list of start tags that end foreign content, plus link.
// title is deliberately absent: inside <svg> it is the SVG title element.
const BREAKOUT_TAGS = new Set(
  (
    "b big blockquote body br center code dd div dl dt em embed h1 h2 h3 h4 h5 h6 head hr i img li " +
    "link listing menu meta nobr ol p pre ruby s small span strong strike sub sup table tt u ul var"
  ).split(" "),
);

// parse5 dedupes each new attribute by scanning the tag's earlier ones, so one
// tag with n attributes costs O(n²): 80k attributes in 512 KB took ~17 s.
// Real meta and link tags carry a handful, so attributes past the cap are
// dropped before that scan. Chosen over a time budget, which would make the
// extracted values depend on machine load.
class CappedTokenizer extends Tokenizer {
  protected override _leaveAttrName(): void {
    const token = this.currentToken;
    if (token !== null && "attrs" in token && token.attrs.length >= MAX_ATTRS) return;
    super._leaveAttrName();
  }
}

// Tokenizes instead of calling parse5's parse(): the tree builder is quadratic
// on deeply nested elements, and a 512 KB page of <div>s blocks for ~30 s.
// Switching the tokenizer into text modes is the part of tree building that
// matters here, so a <meta> inside a <script> string is not read as a tag.
// Tags inside <svg>/<math> (an SVG <title> is not the page title) and inert
// <template> content are skipped. <noscript> and <body> are read like <head>,
// because real pages put meta tags there.
class HeadScanner implements TokenHandler {
  readonly scan: HeadScan = { tags: [], titles: [] };
  readonly tokenizer = new CappedTokenizer({}, this);
  private title: string | null = null;
  private foreignDepth = 0;
  private templateDepth = 0;

  onStartTag(token: Token.TagToken): void {
    this.enterContainer(token);
    if (this.foreignDepth > 0) return;
    const mode = TEXT_MODES.get(token.tagName);
    if (mode !== undefined) this.tokenizer.state = mode;
    if (this.templateDepth === 0) this.collect(token);
  }

  onEndTag(token: Token.TagToken): void {
    if (FOREIGN_ROOTS.has(token.tagName) && this.foreignDepth > 0) this.foreignDepth--;
    else if (token.tagName === "template" && this.foreignDepth === 0 && this.templateDepth > 0) this.templateDepth--;
    this.tokenizer.inForeignNode = this.foreignDepth > 0;
    if (token.tagName === "title") this.closeTitle();
  }

  onCharacter(token: Token.CharacterToken): void {
    if (this.title !== null) this.title += token.chars;
  }

  onWhitespaceCharacter(token: Token.CharacterToken): void {
    this.onCharacter(token);
  }

  onEof(): void {
    this.closeTitle();
  }

  onNullCharacter = ignore;
  onComment = ignore;
  onDoctype = ignore;

  private enterContainer(token: Token.TagToken): void {
    if (this.foreignDepth > 0 && BREAKOUT_TAGS.has(token.tagName)) this.foreignDepth = 0;
    if (FOREIGN_ROOTS.has(token.tagName) && !token.selfClosing) this.foreignDepth++;
    if (token.tagName === "template" && this.foreignDepth === 0) this.templateDepth++;
    this.tokenizer.inForeignNode = this.foreignDepth > 0;
  }

  private collect(token: Token.TagToken): void {
    if (token.tagName === "meta" || token.tagName === "link") this.scan.tags.push(token);
    if (token.tagName === "title") this.title = "";
  }

  private closeTitle(): void {
    if (this.title !== null) this.scan.titles.push(this.title);
    this.title = null;
  }
}

function ignore(): void {
  return;
}

export function scanHead(html: string): HeadScan {
  const scanner = new HeadScanner();
  scanner.tokenizer.write(html, true);
  return scanner.scan;
}
