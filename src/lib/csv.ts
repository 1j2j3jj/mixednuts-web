/**
 * Minimal CSV serialiser. Kept here (not pulled from a library) because the
 * RFC 4180 essentials — quoting fields that contain commas, quotes, or
 * newlines, doubling internal quotes, and using CRLF line endings — fit in
 * under ten lines and a dependency gives us nothing else we need.
 *
 * Cell escaping (including the formula-injection guard — F-1, 2026-07-25)
 * lives in csv-guard.ts, shared with master-csv.ts. See that file's doc
 * comment for the injection threat model and the numeric/string gating
 * rule.
 */
import { escapeCsvCell } from "./csv-guard";

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
    .map((r) => keys.map((k) => escapeCsvCell(r[k])).join(","))
    .join("\r\n");
  // Header row goes through the same guard as body cells — a future caller
  // passing dynamic/data-derived headers must not reopen the F-1 gap.
  return `${cols.map(escapeCsvCell).join(",")}\r\n${body}\r\n`;
}
