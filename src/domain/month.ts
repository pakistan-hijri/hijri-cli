/** Pure assembly of a Hijri month grid from published calendar days. */

import { DataUnavailableError } from "../errors.js";
import type { Confidence, HijriDay } from "./types.js";

export interface MonthCell {
  gregorian: string;
  hijri: string;
  day: number;
  confidence: Confidence;
  today: boolean;
}

export interface MonthView {
  city: { id: string; name: string };
  profile: string;
  year: number;
  month: number;
  monthName: { en: string; ur: string };
  ramadan: boolean;
  confidence: Confidence | "mixed";
  today: string | null;
  gregorianStart: string;
  gregorianEnd: string;
  weeks: (MonthCell | null)[][];
}

export interface BuildMonthInput {
  city: { id: string; name: string };
  profile: string;
  year: number;
  month: number;
  days: Record<string, HijriDay>;
  todayHijri: string | undefined;
}

export function buildMonthView(input: BuildMonthInput): MonthView {
  const entries = Object.entries(input.days)
    .filter(([, value]) => value.year === input.year && value.month === input.month)
    .sort(([left], [right]) => left.localeCompare(right));

  const first = entries[0];
  if (first === undefined) {
    throw new DataUnavailableError(
      `Hijri month ${input.month} of ${input.year} is not published yet.`,
    );
  }
  const last = entries[entries.length - 1] ?? first;

  const cells = entries.map(([gregorian, value]) => ({
    gregorian,
    hijri: value.hijri,
    day: value.day,
    confidence: value.confidence,
    today: input.todayHijri !== undefined && value.hijri === input.todayHijri,
  }));

  const confidences = new Set(cells.map((cell) => cell.confidence));
  const confidence: Confidence | "mixed" =
    confidences.size === 1 ? first[1].confidence : "mixed";

  return {
    city: input.city,
    profile: input.profile,
    year: input.year,
    month: input.month,
    monthName: first[1].monthName,
    ramadan: input.month === 9,
    confidence,
    today: input.todayHijri !== undefined && cells.some((cell) => cell.today)
      ? input.todayHijri
      : null,
    gregorianStart: cells[0]?.gregorian ?? first[0],
    gregorianEnd: last[0],
    weeks: intoWeeks(cells),
  };
}

function intoWeeks(cells: MonthCell[]): (MonthCell | null)[][] {
  const weeks: (MonthCell | null)[][] = [];
  let week: (MonthCell | null)[] = [];
  const firstCell = cells[0];
  if (firstCell !== undefined) {
    week = Array.from({ length: mondayOffset(firstCell.gregorian) }, () => null);
  }

  for (const cell of cells) {
    week.push(cell);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) {
      week.push(null);
    }
    weeks.push(week);
  }
  return weeks;
}

function mondayOffset(date: string): number {
  const instant = new Date(`${date}T12:00:00+05:00`);
  const weekday = Number.isNaN(instant.getTime()) ? 0 : instant.getUTCDay();
  return (weekday + 6) % 7;
}
