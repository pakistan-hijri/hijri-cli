/** Shared camelCase types produced by the API adapter and consumed by domain. */

export const CONFIDENCES = [
  "confirmed",
  "estimated",
  "predicted",
  "unconfirmed",
] as const;

export type Confidence = (typeof CONFIDENCES)[number];

export type Convention = "after-maghrib" | "midnight";

export type TimeFormat = "12h" | "24h";

export interface City {
  id: string;
  name: string;
  province: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  timezone: string;
}

export interface CalendarIndex {
  coverageStart: string | null;
  generatedAt: string;
  baseline: string;
  hijriYears: number[];
  confirmedDays?: number;
}

export interface HijriDay {
  hijri: string;
  year: number;
  month: number;
  day: number;
  monthName: { en: string; ur: string };
  confidence: Confidence;
  sources?: string[];
}

export interface CalendarFile {
  hijriYear: number;
  coverageStart: string | null;
  generatedAt: string;
  baseline: string;
  days: Record<string, HijriDay>;
}

export const PRAYER_IDS = [
  "fajr",
  "sunrise",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
] as const;

export type PrayerId = (typeof PRAYER_IDS)[number];

export interface PrayerTimes {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}

export interface PrayerDay {
  date: string;
  times: PrayerTimes;
}

export interface PrayerMeta {
  city: string;
  cityName: string;
  province: string;
  profile: string;
  profileLabel: string;
  year: number;
  timezone: string;
  generatedAt: string;
  disclaimer: string;
  sehriOffsetMin: number;
  iftarOffsetMin: number;
}

export interface PrayerFile {
  meta: PrayerMeta;
  days: Record<string, PrayerDay>;
}

export interface PrayerDayResult {
  day: PrayerDay;
  meta: PrayerMeta;
}

export interface NextEvent {
  id: PrayerId;
  at: string;
  minutes: number;
}

export interface SehriIftar {
  sehriEnds: string;
  iftar: string;
}
