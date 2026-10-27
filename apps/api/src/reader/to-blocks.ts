import { UNSAFE_TEXT_CHARS, URL_MAX_LENGTH } from "@linkables/shared/links";
import { READER_BLOCKS_MAX, READER_TEXT_MAX, type ReaderBlock, type ReaderInline } from "@linkables/shared/reader";
import { exceedsLimits } from "./tree-limits";

// The slice of the DOM the converter reads; linkedom's nodes satisfy it.
export interface PageNode {
  nodeType: number;
  nodeName: string;
  textContent: string | null;
  childNodes: Iterable<PageNode>;
  getAttribute?: (name: string) => string | null;
}

export type Converted = { blocks: ReaderBlock[]; truncated: boolean };

type Runs = ReaderInline[];
type Marks = Omit<ReaderInline, "text">;
type Sink = { pageUrl: string; push: (block: ReaderBlock | null) => void; full: () => boolean };

const TEXT_NODE = 3;
const ELEMENT_NODE = 1;
const ALT_MAX = 500;
// Above the page limits in extract-article.ts, which Readability's few wrappers stay within.
const CONVERT_LIMITS = { elements: 40_000, depth: 200 };

// Never read: active content, embeds and form controls carry nothing a reader shows.
const SKIPPED = new Set([
  "script", "style", "noscript", "template", "iframe", "frame", "object", "embed", "svg", "math", "canvas",
  "video", "audio", "source", "track", "form", "button", "input", "select", "textarea", "dialog", "link", "meta",
]);
const MARKS: Record<string, Marks> = {
  strong: { bold: true }, b: { bold: true }, em: { italic: true }, i: { italic: true }, cite: { italic: true },
  code: { code: true }, kbd: { code: true }, samp: { code: true },
};
const INLINE = new Set([
  ...Object.keys(MARKS), "a", "span", "small", "sub", "sup", "mark", "abbr", "time", "q", "u", "s", "del", "ins",
  "br", "font", "label", "data", "dfn", "var", "bdi", "wbr",
]);
const HEADINGS: Record<string, 2 | 3 | 4> = { h1: 2, h2: 2, h3: 3, h4: 4, h5: 4, h6: 4 };
const UNSAFE = new RegExp(UNSAFE_TEXT_CHARS.source, "gu");

export function toBlocks(root: PageNode, pageUrl: string): Converted {
  const blocks: ReaderBlock[] = [];
  let chars = 0;
  let truncated = false;
  const sink: Sink = {
    pageUrl,
    full: () => truncated,
    push(block) {
      if (block === null || truncated) return;
      const size = textLength(block);
      if (blocks.length >= READER_BLOCKS_MAX || chars + size > READER_TEXT_MAX) truncated = true;
      else {
        blocks.push(block);
        chars += size;
      }
    },
  };
  // The walk recurses once per level, so a deeper tree is refused, not read.
  if (exceedsLimits(root, CONVERT_LIMITS)) return { blocks, truncated };
  walkBlocks(root, sink);
  return { blocks, truncated };
}

function tagOf(node: PageNode): string {
  return node.nodeType === ELEMENT_NODE ? node.nodeName.toLowerCase() : "";
}

function children(node: PageNode): PageNode[] {
  return [...node.childNodes];
}

function find(node: PageNode, tag: string): PageNode | undefined {
  for (const child of children(node)) {
    if (tagOf(child) === tag) return child;
    const found = find(child, tag);
    if (found !== undefined) return found;
  }
  return undefined;
}

// A link around an image is laid out as a block, so the image is kept.
function isInline(node: PageNode): boolean {
  if (node.nodeType === TEXT_NODE) return true;
  return INLINE.has(tagOf(node)) && find(node, "img") === undefined;
}

function walkBlocks(node: PageNode, sink: Sink): void {
  let loose: PageNode[] = [];
  const flush = () => {
    if (loose.length > 0) sink.push(paragraph(runsOf(loose, sink.pageUrl)));
    loose = [];
  };
  for (const child of children(node)) {
    if (sink.full()) return;
    if (isInline(child)) loose.push(child);
    else if (child.nodeType === ELEMENT_NODE) {
      flush();
      blockFor(child, sink);
    }
  }
  flush();
}

function blockFor(element: PageNode, sink: Sink): void {
  const tag = tagOf(element);
  const level = HEADINGS[tag];
  if (level !== undefined) {
    const content = runsOf([element], sink.pageUrl);
    sink.push(content.length > 0 ? { type: "heading", level, content } : null);
  } else if (tag === "p") sink.push(paragraph(runsOf([element], sink.pageUrl)));
  else if (tag === "ul" || tag === "ol") sink.push(list(element, tag === "ol", sink.pageUrl));
  else if (tag === "blockquote") sink.push(quote(element, sink.pageUrl));
  else if (tag === "pre") sink.push(code(element));
  else if (tag === "img") sink.push(image(element, null, sink.pageUrl));
  else if (tag === "figure" || tag === "picture") figure(element, sink);
  else if (!SKIPPED.has(tag) && tag !== "hr") walkBlocks(element, sink);
}

function paragraph(content: Runs): ReaderBlock | null {
  return content.length > 0 ? { type: "paragraph", content } : null;
}

function list(element: PageNode, ordered: boolean, pageUrl: string): ReaderBlock | null {
  const items = children(element)
    .filter((child) => tagOf(child) === "li")
    .map((item) => runsOf([item], pageUrl))
    .filter((runs) => runs.length > 0);
  return items.length > 0 ? { type: "list", ordered, items } : null;
}

// A quote keeps its paragraphs; anything richer inside it is read as text.
function quote(element: PageNode, pageUrl: string): ReaderBlock | null {
  const inner: ReaderBlock[] = [];
  walkBlocks(element, { pageUrl, full: () => false, push: (block) => { if (block) inner.push(block); } });
  const paragraphs = inner.flatMap(blockRuns);
  return paragraphs.length > 0 ? { type: "quote", paragraphs } : null;
}

export function blockRuns(block: ReaderBlock): Runs[] {
  switch (block.type) {
    case "heading":
    case "paragraph":
      return [block.content];
    case "list":
      return block.items;
    case "quote":
      return block.paragraphs;
    case "code":
      return [[{ text: block.text, code: true }]];
    case "image":
      return [];
  }
}

function code(element: PageNode): ReaderBlock | null {
  const text = (element.textContent ?? "").replace(UNSAFE, "").replace(/^\n+|\s+$/g, "");
  return text === "" ? null : { type: "code", text };
}

function figure(element: PageNode, sink: Sink): void {
  const img = tagOf(element) === "img" ? element : find(element, "img");
  if (img === undefined) {
    walkBlocks(element, sink);
    return;
  }
  const caption = find(element, "figcaption");
  sink.push(image(img, caption === undefined ? null : plainText(caption, ALT_MAX), sink.pageUrl));
}

function image(img: PageNode, caption: string | null, pageUrl: string): ReaderBlock | null {
  const src = safeUrl(img.getAttribute?.("src") ?? null, pageUrl);
  if (src === null) return null;
  return { type: "image", src, alt: plainText(img.getAttribute?.("alt") ?? "", ALT_MAX), caption };
}

function plainText(value: PageNode | string, max: number): string | null {
  const raw = typeof value === "string" ? value : (value.textContent ?? "");
  const text = raw.replace(UNSAFE, "").replace(/\s+/g, " ").trim();
  return text === "" ? null : Array.from(text).slice(0, max).join("");
}

export function safeUrl(raw: string | null, pageUrl: string): string | null {
  if (raw === null || raw.trim() === "") return null;
  const url = URL.parse(raw.trim(), pageUrl);
  if (url === null || (url.protocol !== "http:" && url.protocol !== "https:")) return null;
  return url.href.length > URL_MAX_LENGTH ? null : url.href;
}

function runsOf(nodes: PageNode[], pageUrl: string): Runs {
  const runs: Runs = [];
  for (const node of nodes) collectRuns(node, {}, pageUrl, runs);
  return tidyRuns(runs);
}

function collectRuns(node: PageNode, marks: Marks, pageUrl: string, runs: Runs): void {
  if (node.nodeType === TEXT_NODE) {
    runs.push({ ...marks, text: (node.textContent ?? "").replace(UNSAFE, "").replace(/\s+/g, " ") });
    return;
  }
  const tag = tagOf(node);
  if (tag === "" || SKIPPED.has(tag) || tag === "img") return;
  if (tag === "br") {
    runs.push({ ...marks, text: "\n" });
    return;
  }
  const href = tag === "a" ? safeUrl(node.getAttribute?.("href") ?? null, pageUrl) : null;
  const inner: Marks = { ...marks, ...MARKS[tag], ...(href === null ? {} : { href }) };
  // Block elements read as text (a list inside a list item) keep a word break.
  const block = !INLINE.has(tag);
  if (block) runs.push({ ...marks, text: " " });
  for (const child of children(node)) collectRuns(child, inner, pageUrl, runs);
  if (block) runs.push({ ...marks, text: " " });
}

function sameMarks(a: ReaderInline, b: ReaderInline): boolean {
  return a.href === b.href && a.bold === b.bold && a.italic === b.italic && a.code === b.code;
}

// Whitespace is collapsed across runs, trimmed at the block's edges, and runs
// with the same marks are joined, so the stored form is small and stable.
function tidyRuns(runs: Runs): Runs {
  const tidy: Runs = [];
  let atBreak = true;
  for (const run of runs) {
    let text = run.text.replace(/ ?\n ?/g, "\n");
    if (atBreak) text = text.replace(/^[ \n]+/, "");
    if (text === "") continue;
    atBreak = /[ \n]$/.test(text);
    const last = tidy.at(-1);
    if (last !== undefined && sameMarks(last, run)) last.text += text;
    else tidy.push({ ...run, text });
  }
  for (let last = tidy.at(-1); last !== undefined; last = tidy.at(-1)) {
    last.text = last.text.replace(/[ \n]+$/, "");
    if (last.text !== "") break;
    tidy.pop();
  }
  return tidy;
}

function textLength(block: ReaderBlock): number {
  if (block.type === "code") return block.text.length;
  if (block.type === "image") return (block.alt?.length ?? 0) + (block.caption?.length ?? 0);
  return blockRuns(block).reduce((sum, runs) => sum + runs.reduce((n, run) => n + run.text.length, 0), 0);
}
