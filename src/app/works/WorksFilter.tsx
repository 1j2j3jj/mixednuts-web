"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MetricValue, Phrases } from "@/components/v6/KineticText";

type FilterTheme = {
  id: string;
  label: string;
  lead: string;
  count: number;
};

type FilterWork = {
  slug: string;
  theme: string;
  problem: string;
  move: string;
  metric: { label: string; value: string }[];
  industry: string;
  services: string[];
};

const serviceLabels: Record<string, string> = {
  strategy: "STRATEGY",
  ai: "AI",
  marketing: "MARKETING",
};

function themeFromHash(validThemes: Set<string>) {
  const theme = new URLSearchParams(window.location.hash.slice(1)).get("theme");
  return theme === "all" || (theme && validThemes.has(theme)) ? theme : "all";
}

export default function WorksFilter({ themes, works }: { themes: FilterTheme[]; works: FilterWork[] }) {
  const [activeTheme, setActiveTheme] = useState("all");
  const validThemes = useMemo(() => new Set(themes.map((theme) => theme.id)), [themes]);
  const selectedTheme = themes.find((theme) => theme.id === activeTheme);
  const visibleWorks = activeTheme === "all" ? works : works.filter((work) => work.theme === activeTheme);
  const visibleIndex = new Map(visibleWorks.map((work, index) => [work.slug, index + 1]));
  const themeLabels = new Map(themes.map((theme) => [theme.id, theme.label]));

  useEffect(() => {
    const syncFromHash = () => setActiveTheme(themeFromHash(validThemes));
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [validThemes]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      window.dispatchEvent(new CustomEvent("works:filter-change"));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeTheme]);

  const selectTheme = (theme: string) => {
    setActiveTheme(theme);
    const hash = new URLSearchParams({ theme }).toString();
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${hash}`);
  };

  return (
    <section className="works-filter-scene" data-nav="light" aria-labelledby="works-filter-heading">
      <header className="works-filter-heading" data-reveal>
        <p className="works-kicker">Problem filter</p>
        <div>
          <h2 id="works-filter-heading">課題の型から、<br />ケースを探す。</h2>
          <p>似た業界ではなく、いま直面している課題に近い入口を選んでください。</p>
        </div>
        <p className="index-status">{works.length} CASE FILES</p>
      </header>

      <div className="works-filter-controls">
        <div className="works-theme-chips" role="group" aria-label="課題テーマで絞り込む">
          <button type="button" aria-pressed={activeTheme === "all"} onClick={() => selectTheme("all")}>
            すべて <span>({works.length})</span>
          </button>
          {themes.map((theme) => (
            <button
              type="button"
              aria-pressed={activeTheme === theme.id}
              onClick={() => selectTheme(theme.id)}
              key={theme.id}
            >
              {theme.label} <span>({theme.count})</span>
            </button>
          ))}
        </div>
        <p className="works-filter-count" aria-live="polite" aria-atomic="true">{visibleWorks.length} 件</p>
      </div>

      <p className="works-filter-description" aria-hidden={!selectedTheme}>
        {selectedTheme?.lead ?? "\u00a0"}
      </p>

      <div className="problem-case-list">
        {works.map((work) => {
          const number = visibleIndex.get(work.slug);
          const hidden = number === undefined;
          return (
            <Link
              className="problem-case-row"
              href={`/works/${work.slug}`}
              data-row-reveal
              hidden={hidden}
              key={work.slug}
            >
              <span className="problem-case-number">{String(number ?? 0).padStart(2, "0")}</span>
              <div className="case-problem-column">
                <p className="problem-case-theme">{themeLabels.get(work.theme)}</p>
                <h3 className="case-problem"><Phrases text={work.problem} /></h3>
              </div>
              <div className="case-move-column">
                <p className="case-move">{work.move}</p>
                {work.metric.length > 0 && (
                  <div className="problem-case-metrics" data-odometer>
                    {work.metric.slice(0, 3).map((metric) => (
                      <span key={metric.label}>
                        <small>{metric.label}</small>
                        <strong><MetricValue value={metric.value} /></strong>
                      </span>
                    ))}
                  </div>
                )}
                <p className="problem-case-tags">
                  {work.industry} · {work.services.map((service) => serviceLabels[service] ?? service).join(" · ")}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
