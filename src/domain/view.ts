/** Assemble the resolved today view shared by every renderer. */

import type {
  Confidence,
  HijriDay,
  NextEvent,
  PrayerDay,
  PrayerId,
  PrayerMeta,
  SehriIftar,
} from "./types.js";
import { PRAYER_IDS } from "./types.js";
import { sehriIftar as calculateSehriIftar } from "./schedule.js";

export const DISCLAIMER = "Calculated times; verify locally.";

export interface TodayView {
  city: { id: string; name: string };
  profile: string;
  gregorian: string;
  hijri: {
    date: string;
    day: number;
    month: number;
    year: number;
    monthName: { en: string; ur: string };
  };
  confidence: Confidence;
  afterMaghrib: boolean;
  ramadan: boolean;
  prayers: { id: PrayerId; label: string; at: string }[];
  sehriIftar: SehriIftar | null;
  next: NextView | null;
  explicitDate: boolean;
}

export interface NextView {
  id: PrayerId;
  label: string;
  at: string;
  minutes: number;
  isTomorrow: boolean;
}

export interface BuildViewInput {
  city: { id: string; name: string };
  profile: string;
  gregorian: string;
  hijri: HijriDay;
  afterMaghrib: boolean;
  explicitDate: boolean;
  prayer: PrayerDay;
  meta: PrayerMeta;
  next: (NextEvent & { isTomorrow: boolean; ramadan: boolean }) | null;
}

export function buildTodayView(input: BuildViewInput): TodayView {
  const ramadan = input.hijri.month === 9;
  const sehriIftar = calculateSehriIftar(input.prayer, input.meta, input.hijri.month);

  return {
    city: input.city,
    profile: input.profile,
    gregorian: input.gregorian,
    hijri: {
      date: input.hijri.hijri,
      day: input.hijri.day,
      month: input.hijri.month,
      year: input.hijri.year,
      monthName: input.hijri.monthName,
    },
    confidence: input.hijri.confidence,
    afterMaghrib: input.afterMaghrib,
    ramadan,
    prayers: PRAYER_IDS.map((id) => ({
      id,
      label: eventLabel(id, ramadan, false),
      at: input.prayer.times[id],
    })),
    sehriIftar,
    next: input.next
      ? {
          id: input.next.id,
          label: eventLabel(
            input.next.id,
            input.next.ramadan,
            input.next.isTomorrow,
          ),
          at: input.next.at,
          minutes: input.next.minutes,
          isTomorrow: input.next.isTomorrow,
        }
      : null,
    explicitDate: input.explicitDate,
  };
}

export function eventLabel(
  id: PrayerId,
  ramadan: boolean,
  tomorrow: boolean,
): string {
  const base =
    ramadan && id === "fajr"
      ? "Sehri ends"
      : ramadan && id === "maghrib"
        ? "Iftar"
        : id.charAt(0).toUpperCase() + id.slice(1);
  return tomorrow ? `${base} (tomorrow)` : base;
}

