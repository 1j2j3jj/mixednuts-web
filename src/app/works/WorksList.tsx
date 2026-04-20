"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Work } from "@/data/works";

const bgClasses: Record<string, string> = {
  ai: "case-bg-ai",
  strategy: "case-bg-strategy",
  marketing: "case-bg-marketing",
};

const serviceLabels: Record<string, string> = {
  ai: "AI",
  strategy: "Strategy",
  marketing: "Marketing",
};

type Filter = "all" | "strategy" | "ai" | "marketing";

const filters: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "strategy", label: "Strategy" },
  { key: "ai", label: "AI Implementation" },
  { key: "marketing", label: "Marketing & Growth" },
];

export default function WorksList({ works }: { works: Work[] }) {
  const [active, setActive] = useState<Filter>("all");

  const filtered = useMemo(() => {
    if (active === "all") return works;
    return works.filter((w) => w.services.includes(active));
  }, [active, works]);

  const counts = useMemo(() => {
    return filters.reduce<Record<Filter, number>>(
      (acc, f) => {
        if (f.key === "all") {
          acc[f.key] = works.length;
        } else {
          const key = f.key;
          acc[f.key] = works.filter((w) => w.services.includes(key)).length;
        }
        return acc;
      },
      { all: 0, strategy: 0, ai: 0, marketing: 0 }
    );
  }, [works]);

  return (
    <>
      <div className="works-filters">
        <div className="works-filters-inner">
          <span className="filter-label">Service</span>
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setActive(f.key)}
              className={`filter-tag ${active === f.key ? "active" : ""}`}
            >
              {f.label} <span className="filter-count">{counts[f.key]}</span>
            </button>
          ))}
        </div>
      </div>

      <section className="section" style={{ background: "var(--off-white-alt)" }}>
        <div className="section-inner">
          {filtered.length === 0 ? (
            <p style={{ textAlign: "center", padding: "48px 0", color: "var(--gray-400)" }}>
              該当する事例はありません。
            </p>
          ) : (
            <div className="cases-grid">
              {filtered.map((work) => {
                const primaryService = work.services[0];
                const bgClass = bgClasses[primaryService] || "case-bg-strategy";
                const serviceLabel = work.services.map((s) => serviceLabels[s]).join(" × ");

                return (
                  <Link key={work.slug} href={`/works/${work.slug}`} className="case-card">
                    <div className={`case-image ${bgClass}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={work.image}
                        alt={work.title}
                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.4 }}
                      />
                      <span className="case-tag-badge">{serviceLabel}</span>
                    </div>
                    <div className="case-body">
                      <div className="case-header">
                        <span className="case-industry">{work.industry}</span>
                      </div>
                      <div className="case-title">{work.title}</div>
                      <div className="case-metrics">
                        {work.metric.slice(0, 2).map((m) => (
                          <div key={m.label}>
                            <div className="case-metric-label">{m.label}</div>
                            <div
                              className={`case-metric-value ${
                                m.value.startsWith("+") || m.value.includes("x") ? "gain" : ""
                              }`}
                            >
                              {m.value}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="case-desc">{work.summary}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
