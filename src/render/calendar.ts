/** Pure card, plain, and JSON renderers for the Hijri month view. */

import type { MonthCell, MonthView } from "../domain/month.js";
import type { StatusView } from "../domain/view.js";
import type { TimeFormat } from "../domain/types.js";
import {
  badge,
  crescent,
  frame,
  marker,
  section,
} from "./decor.js";
import type { DecorStyle } from "./decor.js";
import { rightAlign, visualRtl } from "./rtl.js";
import { createTheme } from "./theme.js";
import { formatCountdown, formatTime } from "./time.js";

const RULE_WIDTH = 40;
const CELL_WIDTH = 4;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKDAYS_ASCII = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const RAMADAN_NOTE = "Ramadan: Sehri ends at Fajr; Iftar at Maghrib.";
const NOT_OFFICIAL = "Only confirmed dates are official.";

const shortDate = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Karachi",
  day: "numeric",
  month: "short",
  year: "numeric",
});

export interface CalendarRenderOptions {
  color: boolean;
  ascii: boolean;
  format: TimeFormat;
  status: StatusView | null;
}

export function renderCalendarCard(
  view: MonthView,
  options: CalendarRenderOptions,
): string {
  const theme = createTheme(options.color);
  const separator = options.ascii ? " - " : " · ";
  const style: DecorStyle = { ascii: options.ascii, theme };
  const lines: string[] = [
    ...frame(
      "CALENDAR",
      `${view.city.name}${separator}${view.monthName.en} ${view.year} AH`,
      style,
    ),
  ];

  if (!options.ascii) {
    lines.push(rightAlign(visualRtl(view.monthName.ur), RULE_WIDTH));
  }
  lines.push(gregorianRange(view, options.ascii));

  if (view.ramadan) {
    lines.push(theme.accent(`${crescent(style)} ${RAMADAN_NOTE}`));
  }

  if (options.status !== null) {
    lines.push(section("NOW", style));
    lines.push(statusLine(options.status, options, style));
  }

  lines.push(section(view.monthName.en.toUpperCase(), style));
  lines.push(weekdayHeader(options.ascii));
  for (const week of view.weeks) {
    lines.push(
      row(week.map((cell) => (cell === null ? "" : mark(cell)))),
    );
    lines.push(
      theme.dim(
        row(
          week.map((cell) =>
            cell === null ? "" : String(dayOfMonth(cell.gregorian)),
          ),
        ),
      ),
    );
  }

  lines.push(section("LEGEND", style));
  if (view.today !== null) {
    lines.push("* today");
  }
  lines.push(`${badge(view.confidence.toUpperCase(), style)}  ${view.profile}`);
  if (view.confidence !== "confirmed") {
    lines.push(theme.warning(NOT_OFFICIAL));
  }
  return `${lines.join("\n")}\n`;
}

export function renderCalendarPlain(
  view: MonthView,
  options: CalendarRenderOptions,
): string {
  const separator = options.ascii ? " - " : " · ";
  const lines = [
    `Hijri${separator}${view.city.name}`,
    `${view.monthName.en} ${view.year} AH`,
  ];

  if (!options.ascii) {
    lines.push(rightAlign(visualRtl(view.monthName.ur), RULE_WIDTH));
  }
  lines.push(gregorianRange(view, options.ascii));

  if (view.ramadan) {
    lines.push(RAMADAN_NOTE);
  }

  lines.push(weekdayHeader(options.ascii));
  for (const week of view.weeks) {
    lines.push(row(week.map((cell) => (cell === null ? "" : mark(cell)))));
    lines.push(
      row(
        week.map((cell) =>
          cell === null ? "" : String(dayOfMonth(cell.gregorian)),
        ),
      ),
    );
  }

  if (view.today !== null) {
    lines.push("* today");
  }
  lines.push(`Confidence: ${view.confidence}`);
  if (view.confidence !== "confirmed") {
    lines.push(NOT_OFFICIAL);
  }
  return `${lines.join("\n")}\n`;
}

export function renderCalendarJson(view: MonthView): string {
  const payload = {
    ok: true,
    data: {
      city: view.city.id,
      profile: view.profile,
      year: view.year,
      month: view.month,
      monthName: view.monthName,
      ramadan: view.ramadan,
      confidence: view.confidence,
      today: view.today,
      days: view.weeks
        .flat()
        .filter((cell): cell is MonthCell => cell !== null)
        .map((cell) => ({
          hijri: cell.hijri,
          day: cell.day,
          gregorian: cell.gregorian,
          confidence: cell.confidence,
        })),
    },
  };
  return `${JSON.stringify(payload, null, 2)}\n`;
}

function statusLine(
  status: StatusView,
  options: CalendarRenderOptions,
  style: DecorStyle,
): string {
  if (status.next === null) {
    return "Next: unavailable.";
  }
  const separator = options.ascii ? " - " : " · ";
  const next = status.next;
  const when = next.isTomorrow ? " tomorrow" : "";
  return `${marker(style)} ${next.label}${when} ${formatTime(next.at, options.format)}${separator}${formatCountdown(next.minutes)}`;
}

function mark(cell: MonthCell): string {
  return `${cell.today ? "*" : " "}${String(cell.day).padStart(2, " ")}`;
}

function row(values: string[]): string {
  return values.map((value) => cell(value)).join("").trimEnd();
}

function cell(value: string): string {
  return value === ""
    ? " ".repeat(CELL_WIDTH)
    : `${value.padStart(CELL_WIDTH - 1, " ")} `;
}

function weekdayHeader(ascii: boolean): string {
  return (ascii ? WEEKDAYS_ASCII : WEEKDAYS)
    .map((name) => name.padEnd(CELL_WIDTH, " "))
    .join("")
    .trimEnd();
}

function dayOfMonth(date: string): number {
  return Number(date.slice(8, 10));
}

function gregorianRange(view: MonthView, ascii: boolean): string {
  const dash = ascii ? " to " : " – ";
  const start = shortDate.format(atNoon(view.gregorianStart));
  const end = shortDate.format(atNoon(view.gregorianEnd));
  const sameMonth = view.gregorianStart.slice(0, 7) === view.gregorianEnd.slice(0, 7);
  return sameMonth
    ? `${dayOfMonth(view.gregorianStart)}${dash}${end}`
    : `${start}${dash}${end}`;
}

function atNoon(date: string): Date {
  return new Date(`${date}T12:00:00+05:00`);
}
