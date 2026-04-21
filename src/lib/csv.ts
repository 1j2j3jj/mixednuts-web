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

export function toCsv(rows: Array<Record<string, unknown>>, headers?: string[]): string {
  if (rows.length === 0) return "";
  const cols = headers ?? Object.keys(rows[0]);
  const body = rows.map((r) => cols.map((c) => escapeCell(r[c])).join(",")).join("\r\n");
  return `${cols.join(",")}\r\n${body}\r\n`;
}
