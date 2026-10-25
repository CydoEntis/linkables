import type { ReaderBlock, ReaderInline } from "@linkables/shared/reader";
import { safeHref } from "../links/link-display";

// Page content arrives as typed blocks and is rendered as React elements only,
// never as HTML, so nothing from the page can run here.
export function ReaderBlocks({ blocks }: { blocks: ReaderBlock[] }) {
  return blocks.map((block, index) => <Block key={index} block={block} />);
}

const HEADING_CLASS = "mt-10 mb-3 font-bold tracking-[-0.01em] text-foreground";

function Block({ block }: { block: ReaderBlock }) {
  switch (block.type) {
    case "heading": {
      const Tag = `h${String(block.level)}` as "h2" | "h3" | "h4";
      const size = block.level === 2 ? "text-[23px] leading-[1.3]" : block.level === 3 ? "text-[20px] leading-[1.35]" : "text-[18px]";
      return <Tag className={`${HEADING_CLASS} ${size}`}><Runs runs={block.content} /></Tag>;
    }
    case "paragraph":
      return <p className="mb-5 whitespace-pre-line"><Runs runs={block.content} /></p>;
    case "list": {
      const Tag = block.ordered ? "ol" : "ul";
      return (
        <Tag className={`mb-5 flex flex-col gap-1.5 pl-6 ${block.ordered ? "list-decimal" : "list-disc"}`}>
          {block.items.map((runs, index) => <li key={index} className="pl-1"><Runs runs={runs} /></li>)}
        </Tag>
      );
    }
    case "quote":
      return (
        <blockquote className="mb-5 border-l-2 border-primary pl-4 text-muted-foreground italic">
          {block.paragraphs.map((runs, index) => <p key={index} className="mb-2 last:mb-0"><Runs runs={runs} /></p>)}
        </blockquote>
      );
    case "code":
      return (
        <pre className="mb-5 overflow-x-auto rounded-lg bg-muted px-4 py-3 font-mono text-[14px] leading-[1.6]">
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
    <figure className="mb-6">
      <img
        src={src}
        alt={block.alt ?? ""}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className="mx-auto h-auto max-w-full rounded-lg"
      />
      {block.caption ? <figcaption className="mt-2 text-center text-[14px] text-muted-foreground">{block.caption}</figcaption> : null}
    </figure>
  );
}

function Runs({ runs }: { runs: ReaderInline[] }) {
  return runs.map((run, index) => <Run key={index} run={run} />);
}

function Run({ run }: { run: ReaderInline }) {
  let node = <>{run.text}</>;
  if (run.code) node = <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.88em]">{node}</code>;
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
