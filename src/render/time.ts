/** Pakistan-zoned clock, date, and countdown formatting. */

import type { TimeFormat } from "../domain/types.js";

const TIME_ZONE = "Asia/Karachi";

const twelveHour = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const twentyFourHour = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const fullDate = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function formatTime(iso: string, format: TimeFormat): string {
  const instant = new Date(iso);
  if (Number.isNaN(instant.getTime())) {
    return "--:--";
  }
  return format === "24h"
    ? twentyFourHour.format(instant)
    : twelveHour.format(instant);
}

export function formatClock(iso: string): string {
  return formatTime(iso, "24h");
}

export function formatWeekday(date: string): string {
  const instant = new Date(`${date}T12:00:00+05:00`);
  if (Number.isNaN(instant.getTime())) {
    return date;
  }
  return fullDate.format(instant);
}

export function formatCountdown(minutes: number): string {
  if (minutes <= 0) {
    return "now";
  }
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) {
    return `${remainder}m`;
  }
  if (remainder === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainder}m`;
}
