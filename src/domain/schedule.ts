/** Pure prayer ordering, countdown selection, and Ramadan offsets. */

import type {
  NextEvent,
  PrayerDay,
  PrayerId,
  PrayerMeta,
  SehriIftar,
} from "./types.js";
import { PRAYER_IDS } from "./types.js";

export interface PrayerEvent {
  id: PrayerId;
  at: string;
}

export interface ScheduleContext {
  meta: PrayerMeta;
  month: number;
}

export function orderedEvents(
  day: PrayerDay,
  context?: ScheduleContext,
): PrayerEvent[] {
  return PRAYER_IDS.map((id) => ({ id, at: eventInstant(day, id, context) }));
}

export function nextEvent(
  now: Date,
  day: PrayerDay,
  context?: ScheduleContext,
): NextEvent | null {
  const nowMs = now.getTime();
  for (const event of orderedEvents(day, context)) {
    const atMs = new Date(event.at).getTime();
    if (Number.isNaN(atMs) || atMs <= nowMs) {
      continue;
    }
    return {
      id: event.id,
      at: event.at,
      minutes: Math.max(0, Math.ceil((atMs - nowMs) / 60_000)),
    };
  }
  return null;
}

export function sehriIftar(
  day: PrayerDay,
  meta: PrayerMeta,
  month: number,
): SehriIftar | null {
  if (month !== 9) {
    return null;
  }
  const context: ScheduleContext = { meta, month };
  return {
    sehriEnds: eventInstant(day, "fajr", context),
    iftar: eventInstant(day, "maghrib", context),
  };
}

function eventInstant(
  day: PrayerDay,
  id: PrayerId,
  context: ScheduleContext | undefined,
): string {
  if (context === undefined || context.month !== 9) {
    return day.times[id];
  }
  if (id === "fajr") {
    return addMinutes(day.times.fajr, context.meta.sehriOffsetMin);
  }
  if (id === "maghrib") {
    return addMinutes(day.times.maghrib, context.meta.iftarOffsetMin);
  }
  return day.times[id];
}

export function addMinutes(iso: string, minutes: number): string {
  const instant = new Date(iso);
  if (Number.isNaN(instant.getTime())) {
    return iso;
  }
  return new Date(instant.getTime() + minutes * 60_000).toISOString();
}
