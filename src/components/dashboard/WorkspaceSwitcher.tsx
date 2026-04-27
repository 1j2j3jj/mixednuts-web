"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

export interface WorkspaceItem {
  /** Unique key — slug for clients, "admin" for admin workspace. */
  key: string;
  label: string;
  subtitle?: string;
  href: string;
  isAdmin?: boolean;
}

interface Props {
  current: string | "admin";
  items: WorkspaceItem[];
  isAdmin: boolean;
}

/** Keyboard shortcut hint — derived client-side to avoid SSR/hydration mismatch. */
function KbdHint() {
  const [hint, setHint] = useState("⌘K");
  useEffect(() => {
    // navigator is safe here (client only, inside useEffect)
    setHint(navigator.platform.includes("Mac") ? "⌘K" : "Ctrl+K");
  }, []);
  return (
    <span className="ml-0.5 rounded border border-neutral-200 bg-neutral-50 px-1 py-px font-mono text-[10px] text-muted-foreground">
      {hint}
    </span>
  );
}

/**
 * Workspace switcher dropdown.
 *
 * - Shows current workspace label in header with a chevron toggle.
 * - Clicking opens a dropdown list of available workspaces.
 * - Cmd+K (Mac) / Ctrl+K (Win/Linux) toggles the dropdown.
 * - Admin workspace appears at bottom with a visual separator when isAdmin=true.
 * - Client-side only interactions; props are serialised from the Server Component.
 */
export default function WorkspaceSwitcher({ current, items, isAdmin }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentItem = items.find((i) => i.key === current);
  const clientItems = items.filter((i) => !i.isAdmin);
  const adminItem = items.find((i) => i.isAdmin);

  const filtered =
    query.trim() === ""
      ? clientItems
      : clientItems.filter(
          (i) =>
            i.label.toLowerCase().includes(query.toLowerCase()) ||
            (i.subtitle?.toLowerCase().includes(query.toLowerCase()) ?? false)
        );

  // Close on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Cmd+K / Ctrl+K toggle
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => {
          if (!prev) setTimeout(() => inputRef.current?.focus(), 10);
          return !prev;
        });
        setQuery("");
      }
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function handleOpen() {
    setOpen((prev) => {
      if (!prev) setTimeout(() => inputRef.current?.focus(), 10);
      return !prev;
    });
    setQuery("");
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-semibold hover:bg-neutral-100"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {currentItem?.label ?? (current === "admin" ? "Admin" : current)}
        <svg
          className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <KbdHint />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-72 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg">
          {/* Search input */}
          <div className="border-b border-neutral-100 px-3 py-2">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="クライアントを検索…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          {/* Client list */}
          <ul role="listbox" className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-xs text-muted-foreground">該当なし</li>
            )}
            {filtered.map((item) => (
              <li key={item.key} role="option" aria-selected={item.key === current}>
                <Link
                  href={item.href}
                  onClick={() => {
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`flex items-center gap-2 px-3 py-2 text-sm hover:bg-neutral-50 ${
                    item.key === current ? "bg-neutral-50 font-medium" : ""
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      item.key === current ? "bg-neutral-900" : "bg-neutral-300"
                    }`}
                  />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.subtitle && (
                    <span className="truncate text-xs text-muted-foreground">{item.subtitle}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>

          {/* Admin link — separator at bottom */}
          {isAdmin && adminItem && (
            <div className="border-t border-neutral-100">
              <Link
                href={adminItem.href}
                onClick={() => {
                  setOpen(false);
                  setQuery("");
                }}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-neutral-50 ${
                  current === "admin" ? "text-neutral-900" : "text-muted-foreground"
                }`}
              >
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <rect x="2" y="2" width="12" height="12" rx="2" />
                  <path d="M5 8h6M8 5v6" strokeLinecap="round" />
                </svg>
                管理パネルへ
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
