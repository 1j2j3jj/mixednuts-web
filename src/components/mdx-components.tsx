import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

function Tldr({ children }: { children: ReactNode }) {
  return (
    <div className="tldr">
      <div className="tldr-label">TL;DR</div>
      <div>{children}</div>
    </div>
  );
}

/**
 * Inline citation marker. Renders as a superscript [n] that links to
 * the corresponding source in the "参考文献 / Sources" section at the
 * end of the article. Use as <Cite n={1}>Claim statement</Cite> — the
 * visible text stays inline, the superscript is appended.
 */
function Cite({ n, href, children }: { n?: number; href?: string; children: ReactNode }) {
  const label = typeof n === "number" ? `[${n}]` : "[*]";
  return (
    <>
      {children}
      <a
        href={href ?? "#sources"}
        className="inline-cite"
        aria-label={`Reference ${label}`}
      >
        <sup>{label}</sup>
      </a>
    </>
  );
}

/**
 * Pull Quote block. Offset quote used every 350–500 words per
 * long-form editorial best practice (Nielsen/Norman Group).
 */
function PullQuote({ children, author }: { children: ReactNode; author?: string }) {
  return (
    <aside className="pull-quote">
      <p>{children}</p>
      {author && <cite>— {author}</cite>}
    </aside>
  );
}

/**
 * Direct Answer Block. Placed immediately under an H2 to provide a
 * 40–60 word self-contained answer that LLMs (AI Overviews / Perplexity)
 * can extract as a stand-alone citation.
 */
function Answer({ children }: { children: ReactNode }) {
  return (
    <div className="answer-block" role="note">
      <div className="answer-label">結論</div>
      <div>{children}</div>
    </div>
  );
}

/**
 * Statistic callout with inline source attribution.
 */
function Stat({
  value,
  label,
  source,
}: {
  value: string;
  label: string;
  source?: string;
}) {
  return (
    <div className="stat-callout">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {source && <div className="stat-source">出典: {source}</div>}
    </div>
  );
}

function Principle({ num, heading }: { num: string; heading: string }) {
  return (
    <div className="principle">
      <div className="principle-num">PRINCIPLE {num}</div>
      <h3>{heading}</h3>
    </div>
  );
}

function ServiceLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      style={{ color: "var(--navy)", fontWeight: 700, borderBottom: "2px solid var(--cyan)" }}
    >
      {children}
    </Link>
  );
}

function MdxLink({ href, children, ...rest }: ComponentProps<"a">) {
  if (!href) return <a {...rest}>{children}</a>;
  if (href.startsWith("/")) {
    return (
      <Link href={href} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" {...rest}>
      {children}
    </a>
  );
}

export const mdxComponents = {
  Tldr,
  Principle,
  Cite,
  PullQuote,
  Answer,
  Stat,
  ServiceLink,
  a: MdxLink,
};
