import type { ReaderBlock, ReaderInline } from "@linkables/shared/reader";
import { safeHref } from "../links/link-display";

// Page content arrives as typed blocks and is rendered as React elements only,
// never as HTML, so nothing from the page can run here.
export function ReaderBlocks({ blocks }: { blocks: ReaderBlock[] }) {
  return blocks.map((block, index) => <Block key={index} block={block} />);
}

// Sizes are in em so the whole article follows the reader's text size.
const HEADING_CLASS = "mt-[1.8em] mb-[0.6em] font-sans leading-[1.25] font-bold tracking-[-0.015em] text-foreground";
const HEADING_SIZE = { 2: "text-[1.3em]", 3: "text-[1.15em]", 4: "text-[1em]" } as const;

function Block({ block }: { block: ReaderBlock }) {
  switch (block.type) {
    case "heading": {
      const Tag = `h${String(block.level)}` as "h2" | "h3" | "h4";
      return <Tag className={`${HEADING_CLASS} ${HEADING_SIZE[block.level]}`}><Runs runs={block.content} /></Tag>;
    }
    case "paragraph":
      return <p className="mb-[1.1em] whitespace-pre-line"><Runs runs={block.content} /></p>;
    case "list": {
      const Tag = block.ordered ? "ol" : "ul";
      return (
        <Tag className={`mb-[1.1em] pl-[1.2em] ${block.ordered ? "list-decimal" : "list-disc"}`}>
          {block.items.map((runs, index) => <li key={index} className="mb-[0.35em] last:mb-0"><Runs runs={runs} /></li>)}
        </Tag>
      );
    }
    case "quote":
      return (
        <blockquote className="my-[1.6em] border-l-2 border-line-strong pl-[22px] text-[1.12em] leading-[1.55] text-foreground italic">
          {block.paragraphs.map((runs, index) => <p key={index} className="mb-[0.6em] last:mb-0"><Runs runs={runs} /></p>)}
        </blockquote>
      );
    case "code":
      return (
        <pre className="my-[1.4em] overflow-x-auto rounded-[12px] border border-border bg-card px-[18px] py-4 font-mono text-[0.7em] leading-[1.7] text-soft-foreground">
          <code>{block.text}</code>
        </pre>
      );
    case "image":
      return <Figure block={block} />;
  }
}

function Figure({ block }: { block: Extract<ReaderBlock, { type: "image" }> }) {
  const src = safeHref(block.src);
  if (src === undefined) return null;
  return (
    <figure className="my-[1.6em]">
      <img
        src={src}
        alt={block.alt ?? ""}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className="mx-auto h-auto max-w-full rounded-[16px]"
      />
      {block.caption ? <figcaption className="mt-2.5 font-sans text-[13px] leading-[1.5] text-muted-foreground">{block.caption}</figcaption> : null}
    </figure>
  );
}

function Runs({ runs }: { runs: ReaderInline[] }) {
  return runs.map((run, index) => <Run key={index} run={run} />);
}

function Run({ run }: { run: ReaderInline }) {
  let node = <>{run.text}</>;
  if (run.code) node = <code className="rounded-[6px] bg-card px-1 py-0.5 font-mono text-[0.8em]">{node}</code>;
  if (run.italic) node = <em>{node}</em>;
  if (run.bold) node = <strong className="font-bold">{node}</strong>;
  const href = run.href === undefined ? undefined : safeHref(run.href);
  if (href === undefined) return node;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="text-primary underline underline-offset-2">
      {node}
    </a>
  );
}
