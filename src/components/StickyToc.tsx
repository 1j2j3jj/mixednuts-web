"use client";

import { useEffect, useState } from "react";

type Heading = { id: string; text: string };

/**
 * Sticky desktop-only TOC. Scans H2 elements inside <article>,
 * attaches IDs, builds a nav list on the left margin.
 */
export function StickyToc() {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const article = document.querySelector<HTMLElement>("[data-reading-target]");
    if (!article) return;
    const h2s = Array.from(article.querySelectorAll<HTMLElement>("h2"));
    const out: Heading[] = [];
    h2s.forEach((h, idx) => {
      if (!h.id) {
        h.id = `section-${idx}`;
      }
      const text = (h.textContent || "").trim();
      if (text) out.push({ id: h.id, text });
    });
    setHeadings(out);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -70% 0px" }
    );
    h2s.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, []);

  if (headings.length < 2) return null;

  return (
    <nav
      aria-label="目次"
      className="sticky-toc"
      style={{
        position: "sticky",
        top: 96,
        maxHeight: "calc(100vh - 120px)",
        overflowY: "auto",
        fontSize: 12,
        lineHeight: 1.7,
        paddingRight: 12,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-sans-en, sans-serif)",
          fontSize: 10,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "#9CA3AF",
          fontWeight: 700,
          marginBottom: 14,
        }}
      >
        Contents
      </div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              style={{
                color: activeId === h.id ? "var(--charcoal, #0A0A0A)" : "#6B7280",
                fontWeight: activeId === h.id ? 700 : 500,
                textDecoration: "none",
                borderLeft: activeId === h.id ? "2px solid var(--cyan, #00D9FF)" : "2px solid transparent",
                paddingLeft: 10,
                display: "block",
                transition: "all 0.18s ease",
              }}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
      <style>{`
        @media (max-width: 1100px) {
          .sticky-toc { display: none; }
        }
      `}</style>
    </nav>
  );
}
