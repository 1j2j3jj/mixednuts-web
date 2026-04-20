import Link from "next/link";
import type { ReactNode } from "react";

type PageHeroProps = {
  eyebrow?: string;
  title: ReactNode;
  sub?: ReactNode;
  primary?: { label: string; href: string };
  ghost?: { label: string; href: string };
  variant?: "bg" | "paper";
  breadcrumb?: ReactNode;
};

export default function PageHero({
  eyebrow,
  title,
  sub,
  primary,
  ghost,
  variant = "bg",
  breadcrumb,
}: PageHeroProps) {
  return (
    <section className={`hero-v4 ${variant === "paper" ? "variant-paper" : ""}`}>
      <div className="container-v4" style={{ width: "100%" }}>
        {breadcrumb && (
          <div style={{ fontSize: 12, letterSpacing: "0.05em", color: "var(--ink-muted)", marginBottom: 24 }}>
            {breadcrumb}
          </div>
        )}
        {eyebrow && <div className="eyebrow-hero">{eyebrow}</div>}
        <h1>{title}</h1>
        {sub && <p className="lead-v4">{sub}</p>}
        {(primary || ghost) && (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {primary && (
              <Link href={primary.href} className="btn-ink primary">
                {primary.label}
                <span className="arrow">↗</span>
              </Link>
            )}
            {ghost && (
              <Link href={ghost.href} className="btn-ink ghost">
                {ghost.label}
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
