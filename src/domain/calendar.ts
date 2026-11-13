/** Pure Pakistan civil-date arithmetic, Hijri estimates, and day rollover. */

import type { Convention } from "./types.js";

const PAKISTAN_TIME_ZONE = "Asia/Karachi";
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface RolloverInput {
  now: Date;
  civilDate: string;
  convention: Convention;
  maghrib: string | undefined;
  explicitDate: boolean;
}

export interface RolloverResult {
  displayDate: string;
  afterMaghrib: boolean;
}

export function todayInPakistan(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: PAKISTAN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year = partValue(parts, "year");
  const month = partValue(parts, "month");
  const day = partValue(parts, "day");
  return `${year}-${month}-${day}`;
}

export function addDays(date: string, days: number): string {
  const [year, month, day] = dateParts(date);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}

export function gregorianYear(date: string): number {
  return dateParts(date)[0];
}

export function isValidIsoDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }
  const [year, month, day] = dateParts(value);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export function estimateHijriYear(date: string): number {
  const formatter = new Intl.DateTimeFormat("en", {
    calendar: "islamic-umalqura",
    timeZone: PAKISTAN_TIME_ZONE,
    year: "numeric",
  });
  const parts = formatter.formatToParts(instantAtPakistanNoon(date));
  const year = Number(partValue(parts, "year").replace(/\D/g, ""));
  if (Number.isInteger(year) && year > 0) {
    return year;
  }

  const [gregorian] = dateParts(date);
  return Math.floor(((gregorian - 622) * 33) / 32);
}

export function resolveDisplayDate(input: RolloverInput): RolloverResult {
  if (input.explicitDate || input.convention === "midnight") {
    return { displayDate: input.civilDate, afterMaghrib: false };
  }
  if (input.maghrib === undefined) {
    return { displayDate: input.civilDate, afterMaghrib: false };
  }

  const maghrib = new Date(input.maghrib);
  if (Number.isNaN(maghrib.getTime())) {
    return { displayDate: input.civilDate, afterMaghrib: false };
  }

  if (input.now.getTime() >= maghrib.getTime()) {
    return {
      displayDate: addDays(input.civilDate, 1),
      afterMaghrib: true,
    };
  }
  return { displayDate: input.civilDate, afterMaghrib: false };
}

function instantAtPakistanNoon(date: string): Date {
  return new Date(`${date}T12:00:00+05:00`);
}

function dateParts(date: string): [number, number, number] {
  const [year, month, day] = date.split("-").map(Number);
  return [year ?? 0, month ?? 0, day ?? 0];
}

function partValue(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): string {
  return parts.find((part) => part.type === type)?.value ?? "";
}
