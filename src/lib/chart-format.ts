export function formatCompactAxis(value: number, currency = false): string {
  const rounded = Math.round(value);
  const prefix = currency ? "¥" : "";
  if (Math.abs(value) < 1_000) {
    return `${prefix}${rounded.toLocaleString()}`;
  }
  return `${prefix}${Math.round(rounded / 1_000).toLocaleString()}k`;
}

export function formatCompactRevenueAxis(value: number): string {
  const rounded = Math.round(value);
  if (Math.abs(value) < 1_000) return `¥${rounded.toLocaleString()}`;
  if (Math.abs(value) < 1_000_000) {
    return `¥${Math.round(rounded / 1_000).toLocaleString()}k`;
  }
  return `¥${Math.round(rounded / 1_000_000).toLocaleString()}M`;
}
