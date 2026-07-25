/**
 * Minimal CSV serialiser. Kept here (not pulled from a library) because the
 * RFC 4180 essentials — quoting fields that contain commas, quotes, or
 * newlines, doubling internal quotes, and using CRLF line endings — fit in
 * under ten lines and a dependency gives us nothing else we need.
 */

function escapeCell(v: unknown): string {
  if (v == null) return "";
  const s = typeof v === "string" ? v : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(
  rows: Array<Record<string, unknown>>,
  headers?: string[],
): string {
  if (rows.length === 0) return "";
  // `keys` always drives the per-row value lookup (the actual property
  // names on each row object); `headers`, when passed, only substitutes the
  // DISPLAY text on the first line. These must stay decoupled — if the
  // header row itself were used as the lookup key (as a naive `cols =
  // headers ?? Object.keys(rows[0])` used for both jobs would do), passing
  // human-readable Japanese headers would silently blank every data cell,
  // since `row["商品名"]` doesn't resolve when the row's actual key is
  // `productName`.
  const keys = Object.keys(rows[0]);
  const cols = headers ?? keys;
  const body = rows
    .map((r) => keys.map((k) => escapeCell(r[k])).join(","))
    .join("\r\n");
  return `${cols.join(",")}\r\n${body}\r\n`;
}
