"use client";

import { useEffect, useState } from "react";

type Heading = { id: string; text: string };

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
    <nav aria-label="目次" className="sticky-toc">
      <div className="sticky-toc-title">Contents</div>
      <ul className="sticky-toc-list">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              className={`sticky-toc-link${activeId === h.id ? " is-active" : ""}`}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
