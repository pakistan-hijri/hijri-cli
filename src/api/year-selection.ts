/** Hijri year candidate ordering for Gregorian date lookups. */

import { estimateHijriYear } from "../domain/calendar.js";

export function candidateYears(
  date: string,
  listedYears: number[],
): number[] {
  const estimate = estimateHijriYear(date);
  const ordered = [estimate, estimate - 1, estimate + 1, ...listedYears];
  return [...new Set(ordered)].filter((year) => Number.isInteger(year));
}
