/** Zod schemas and wire-to-domain mappers for every hijri-api payload. */

import { z } from "zod";
import type {
  CalendarFile,
  CalendarIndex,
  City,
  HijriDay,
  PrayerDay,
  PrayerFile,
  PrayerMeta,
} from "../domain/types.js";
import { CONFIDENCES } from "../domain/types.js";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const citySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  province: z.string().min(1),
  latitude: z.number(),
  longitude: z.number(),
  elevation: z.number().optional(),
  timezone: z.string().min(1),
});

const cityListSchema = z.array(citySchema);

const calendarIndexSchema = z.object({
  coverage_start: z.string().regex(datePattern).nullable(),
  generated_at: z.string().min(1),
  baseline: z.string().min(1),
  hijri_years: z.array(z.number().int()),
  confirmed_days: z.number().int().optional(),
});

const monthNameSchema = z.object({
  en: z.string().min(1),
  ur: z.string().min(1),
});

const hijriDaySchema = z.object({
  hijri: z.string().min(1),
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(30),
  month_name: monthNameSchema,
  confidence: z.enum(CONFIDENCES),
  sources: z.array(z.string()).optional(),
});

const calendarFileSchema = z.object({
  hijri_year: z.number().int(),
  coverage_start: z.string().regex(datePattern).nullable(),
  generated_at: z.string().min(1),
  baseline: z.string().min(1),
  days: z.record(z.string(), hijriDaySchema),
});

const isoDateTimeSchema = z.string().refine(
  (value) => !Number.isNaN(Date.parse(value)),
  { message: "Expected an ISO date-time" },
);

const prayerTimesSchema = z.object({
  fajr: isoDateTimeSchema,
  sunrise: isoDateTimeSchema,
  dhuhr: isoDateTimeSchema,
  asr: isoDateTimeSchema,
  maghrib: isoDateTimeSchema,
  isha: isoDateTimeSchema,
});

const prayerDaySchema = z.object({
  date: z.string().regex(datePattern),
  times: prayerTimesSchema,
});

const prayerFileSchema = z.object({
  city: z.string().min(1),
  city_name: z.string().min(1),
  province: z.string().min(1),
  profile: z.string().min(1),
  profile_label: z.string().min(1),
  year: z.number().int(),
  timezone: z.string().min(1),
  generated_at: z.string().min(1),
  disclaimer: z.string().min(1),
  sehri_offset_min: z.number().finite(),
  iftar_offset_min: z.number().finite(),
  days: z.record(z.string(), prayerDaySchema),
});

export function parseCities(input: unknown): City[] {
  return cityListSchema.parse(input).map((city) => ({
    id: city.id,
    name: city.name,
    province: city.province,
    latitude: city.latitude,
    longitude: city.longitude,
    ...(city.elevation === undefined ? {} : { elevation: city.elevation }),
    timezone: city.timezone,
  }));
}

export function parseCalendarIndex(input: unknown): CalendarIndex {
  const index = calendarIndexSchema.parse(input);
  return {
    coverageStart: index.coverage_start,
    generatedAt: index.generated_at,
    baseline: index.baseline,
    hijriYears: index.hijri_years,
    ...(index.confirmed_days === undefined
      ? {}
      : { confirmedDays: index.confirmed_days }),
  };
}

export function parseCalendarFile(input: unknown): CalendarFile {
  const file = calendarFileSchema.parse(input);
  return {
    hijriYear: file.hijri_year,
    coverageStart: file.coverage_start,
    generatedAt: file.generated_at,
    baseline: file.baseline,
    days: Object.fromEntries(
      Object.entries(file.days).map(([key, day]) => [key, mapHijriDay(day)]),
    ),
  };
}

export function parsePrayerFile(input: unknown): PrayerFile {
  const file = prayerFileSchema.parse(input);
  const meta: PrayerMeta = {
    city: file.city,
    cityName: file.city_name,
    province: file.province,
    profile: file.profile,
    profileLabel: file.profile_label,
    year: file.year,
    timezone: file.timezone,
    generatedAt: file.generated_at,
    disclaimer: file.disclaimer,
    sehriOffsetMin: file.sehri_offset_min,
    iftarOffsetMin: file.iftar_offset_min,
  };

  return {
    meta,
    days: Object.fromEntries(
      Object.entries(file.days).map(([key, day]) => [key, mapPrayerDay(day)]),
    ),
  };
}

type WireHijriDay = z.infer<typeof hijriDaySchema>;
type WirePrayerDay = z.infer<typeof prayerDaySchema>;

function mapHijriDay(day: WireHijriDay): HijriDay {
  return {
    hijri: day.hijri,
    year: day.year,
    month: day.month,
    day: day.day,
    monthName: day.month_name,
    confidence: day.confidence,
    ...(day.sources === undefined ? {} : { sources: day.sources }),
  };
}

function mapPrayerDay(day: WirePrayerDay): PrayerDay {
  return {
    date: day.date,
    times: day.times,
  };
}
