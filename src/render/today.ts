/** Pure human renderers for the today card and plain text. */

import type { TimeFormat } from "../domain/types.js";
import type { TodayView } from "../domain/view.js";
import { DISCLAIMER } from "../domain/view.js";
import { createTheme } from "./theme.js";
import { formatCountdown, formatTime, formatWeekday } from "./time.js";

const RULE_WIDTH = 40;

export interface RenderOptions {
  format: TimeFormat;
  color: boolean;
  ascii: boolean;
}

export function renderCard(view: TodayView, options: RenderOptions): string {
  const theme = createTheme(options.color);
  const separator = options.ascii ? " - " : " · ";
  const rule = (options.ascii ? "-" : "─").repeat(RULE_WIDTH);
  const lines: string[] = [
    `${theme.bold("Hijri")}${separator}${view.city.name}`,
    rule,
    formatWeekday(view.gregorian),
    hijriLine(view, options.ascii),
  ];

  if (view.afterMaghrib) {
    lines.push(
      theme.dim(`Showing ${view.gregorian} (after Maghrib)`),
    );
  }

  lines.push(nextLine(view));

  if (view.sehriIftar !== null) {
    lines.push(
      theme.accent(
        `Sehri ends ${formatTime(view.sehriIftar.sehriEnds, options.format)}${separator}Iftar ${formatTime(view.sehriIftar.iftar, options.format)}`,
      ),
    );
  }

  lines.push("");
  for (const prayer of view.prayers) {
    lines.push(
      `${prayer.label.padEnd(11)}${formatTime(prayer.at, options.format)}`,
    );
  }
  lines.push("");
  lines.push(`Confidence: ${view.confidence}`);

  if (view.confidence !== "confirmed") {
    lines.push(theme.warning("Only confirmed dates are official."));
  }

  lines.push(theme.dim(DISCLAIMER));
  return `${lines.join("\n")}\n`;
}

export function renderPlain(view: TodayView, options: RenderOptions): string {
  const separator = options.ascii ? " - " : " · ";
  const lines = [
    `Hijri${separator}${view.city.name}`,
    formatWeekday(view.gregorian),
    hijriLine(view, options.ascii),
    `Confidence: ${view.confidence}`,
  ];

  if (view.afterMaghrib) {
    lines.push(`Showing: ${view.gregorian} (after Maghrib)`);
  }

  lines.push(nextLine(view));

  if (view.sehriIftar !== null) {
    lines.push(
      `Sehri ends: ${formatTime(view.sehriIftar.sehriEnds, options.format)}`,
    );
    lines.push(`Iftar: ${formatTime(view.sehriIftar.iftar, options.format)}`);
  }

  for (const prayer of view.prayers) {
    lines.push(`${prayer.label}: ${formatTime(prayer.at, options.format)}`);
  }

  lines.push(DISCLAIMER);
  return `${lines.join("\n")}\n`;
}

function hijriLine(view: TodayView, ascii: boolean): string {
  const base = `${view.hijri.day} ${view.hijri.monthName.en} ${view.hijri.year} AH`;
  return ascii ? base : `${base} · ${view.hijri.monthName.ur}`;
}

function nextLine(view: TodayView): string {
  if (view.next === null) {
    return view.explicitDate
      ? "Date lookup: no countdown."
      : "Next: unavailable.";
  }
  return `Next: ${view.next.label} in ${formatCountdown(view.next.minutes)}`;
}
