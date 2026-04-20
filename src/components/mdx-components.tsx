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
  ServiceLink,
  a: MdxLink,
};
