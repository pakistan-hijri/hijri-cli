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

export function orderedEvents(day: PrayerDay): PrayerEvent[] {
  return PRAYER_IDS.map((id) => ({ id, at: day.times[id] }));
}

export function nextEvent(now: Date, day: PrayerDay): NextEvent | null {
  const nowMs = now.getTime();
  for (const event of orderedEvents(day)) {
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
  return {
    sehriEnds: addMinutes(day.times.fajr, meta.sehriOffsetMin),
    iftar: addMinutes(day.times.maghrib, meta.iftarOffsetMin),
  };
}

export function addMinutes(iso: string, minutes: number): string {
  const instant = new Date(iso);
  if (Number.isNaN(instant.getTime())) {
    return iso;
  }
  return new Date(instant.getTime() + minutes * 60_000).toISOString();
}
