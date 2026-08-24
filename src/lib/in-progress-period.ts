/**
 * Chart completion is a calendar property, deliberately separate from data
 * freshness. `resolveDataTail` answers whether a missing ad row may be
 * zero-filled, while sourceLatestDates/commonConfirmedEnd answer source
 * arrival and cross-source comparability. Using either as "period finished"
 * would incorrectly make today's partial row or the current partial month
 * look complete as soon as a source publishes data.
 */
export function inProgressDailyKey(
  finalDate: string | undefined,
  today: string,
): string | null {
  return finalDate === today ? finalDate : null;
}

export function inProgressMonthlyKey(
  finalMonth: string | undefined,
  today: string,
): string | null {
  const currentMonth = today.slice(0, 7);
  return finalMonth === currentMonth ? finalMonth : null;
}
