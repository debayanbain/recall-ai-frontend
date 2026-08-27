"use client";

import { RichText } from "@/components/rich-text";
import type { EditorBlock } from "@/lib/editor-doc";

/**
 * Renders a stored EditorJS document — the reading view of a hand-edited memory.
 *
 * This is what makes an edit *visible*. `VaultItem.content` is a flat projection kept for
 * search, highlights and the embedding, so rendering it is why a heading a user applied
 * came back looking like an ordinary paragraph after a save. Once an item has a block
 * document, the document is the thing to render and `content` goes back to being the
 * index it exists to be.
 *
 * Every string here is the backend's allowlisted inline subset and goes through
 * `RichText`, which builds React elements from tag names it recognises — there is no
 * `dangerouslySetInnerHTML` on this path.
 */

const HEADING_CLASS: Record<number, string> = {
  1: "font-display text-[26px] leading-tight sm:text-[30px]",
  2: "font-display text-[22px] leading-tight sm:text-[25px]",
  3: "font-display text-[19px] leading-tight sm:text-[21px]",
};

function Heading({ level, markup, spans }: { level: number; markup: string; spans: string[] }) {
  const clamped = Math.min(Math.max(level, 1), 3);
  // h1 is the memory title on this page, so a document heading starts at h2 no matter
  // which size the writer picked — the size is a visual choice, the level is structure.
  const Tag = (clamped === 1 ? "h2" : clamped === 2 ? "h3" : "h4") as "h2" | "h3" | "h4";
  return (
    <Tag className={`mt-5 mb-2 text-foreground ${HEADING_CLASS[clamped]}`}>
      <RichText markup={markup} spans={spans} />
    </Tag>
  );
}

function Block({ block, spans }: { block: EditorBlock; spans: string[] }) {
  const data = block.data as {
    text?: string;
    caption?: string;
    code?: string;
    level?: number;
    style?: string;
    items?: string[];
  };

  switch (block.type) {
    case "header":
      return <Heading level={data.level ?? 2} markup={data.text ?? ""} spans={spans} />;

    case "list": {
      const ordered = data.style === "ordered";
      const ListTag = ordered ? "ol" : "ul";
      return (
        <ListTag
          className={`my-3 space-y-1.5 pl-5 ${ordered ? "list-decimal" : "list-disc"} marker:text-muted-foreground`}
        >
          {(data.items ?? []).map((item, i) => (
            <li key={i} className="pl-1">
              <RichText markup={item} spans={spans} />
            </li>
          ))}
        </ListTag>
      );
    }

    case "quote":
      return (
        <figure className="my-4 border-l-2 border-primary/40 pl-4">
          <blockquote className="text-foreground/90 italic">
            <RichText markup={data.text ?? ""} spans={spans} />
          </blockquote>
          {data.caption ? (
            <figcaption className="mt-1.5 text-[13px] text-muted-foreground not-italic">
              <RichText markup={data.caption} />
            </figcaption>
          ) : null}
        </figure>
      );

    case "code":
      // Plain text by construction (a textarea's value), so it is rendered as a text
      // node rather than parsed — the one block whose angle brackets are the content.
      return (
        <pre className="my-3 overflow-x-auto rounded-xl bg-secondary p-3.5 text-[13.5px] leading-relaxed">
          <code>{data.code ?? ""}</code>
        </pre>
      );

    case "delimiter":
      return <hr className="my-6 border-border" />;

    default:
      return (
        <p className="my-3 whitespace-pre-wrap break-words">
          <RichText markup={data.text ?? ""} spans={spans} />
        </p>
      );
  }
}

export function RichContent({
  blocks,
  spans = [],
  className = "",
}: {
  blocks: EditorBlock[];
  spans?: string[];
  className?: string;
}) {
  return (
    <div className={className}>
      {blocks.map((block, i) => (
        <Block key={i} block={block} spans={spans} />
      ))}
    </div>
  );
}
