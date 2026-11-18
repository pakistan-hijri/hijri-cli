/** `hijri calendar`: resolve a Hijri month and choose one renderer. */

import type { HijriApi } from "../api/client.js";
import { resolveDisplayDate, todayInPakistan } from "../domain/calendar.js";
import { buildMonthView } from "../domain/month.js";
import type { CalendarFile } from "../domain/types.js";
import {
  DataUnavailableError,
  OutOfRangeError,
  UsageError,
} from "../errors.js";
import type { OnboardPrompts } from "../onboard/prompts.js";
import {
  renderCalendarCard,
  renderCalendarJson,
  renderCalendarPlain,
} from "../render/calendar.js";
import type { Writer } from "../render/writer.js";
import { loadRunSettings, parseProfile } from "./settings.js";

export interface CalendarFlags {
  month?: string;
  year?: string;
  city?: string;
  profile?: string;
  h24?: boolean;
  json?: boolean;
  plain?: boolean;
}

export interface CalendarDeps {
  api: Pick<
    HijriApi,
    | "cities"
    | "requireCity"
    | "calendarIndex"
    | "calendarYear"
    | "calendarDay"
    | "prayerDay"
  >;
  configPath: string;
  prompts: OnboardPrompts;
  writer: Writer;
  now: () => Date;
  isTTY: boolean;
  colorEnabled: boolean;
  unicode: boolean;
}

export async function runCalendar(
  flags: CalendarFlags,
  deps: CalendarDeps,
): Promise<void> {
  const profile = parseProfile(flags.profile);
  if (flags.city !== undefined) {
    await deps.api.requireCity(flags.city);
  }
  const monthFlag = parseMonth(flags.month);
  const yearFlag = parseYear(flags.year);

  const config = await loadRunSettings(
    {
      ...(flags.city === undefined ? {} : { city: flags.city }),
      ...(profile === undefined ? {} : { profile }),
      ...(flags.h24 === true ? { timeFormat: "24h" as const } : {}),
    },
    deps,
  );

  const now = deps.now();
  const civilDate = todayInPakistan(now);
  const civilPrayer = await deps.api.prayerDay(
    config.city,
    config.profile,
    civilDate,
  );
  const rollover = resolveDisplayDate({
    now,
    civilDate,
    convention: config.convention,
    maghrib: civilPrayer.day.times.maghrib,
    explicitDate: false,
  });
  const current = await deps.api.calendarDay(rollover.displayDate);
  const year = yearFlag ?? current.year;
  const month = monthFlag ?? current.month;

  const index = await deps.api.calendarIndex();
  if (!index.hijriYears.includes(year)) {
    throw new OutOfRangeError(
      `Hijri year ${year} is not published yet. Available years: ${index.hijriYears.join(", ")}.`,
    );
  }

  let file: CalendarFile;
  try {
    file = await deps.api.calendarYear(year);
  } catch (error) {
    throw new DataUnavailableError(
      `Could not load the Hijri calendar for ${year}.`,
      error,
    );
  }

  const view = buildMonthView({
    city: { id: config.city, name: civilPrayer.meta.cityName },
    profile: config.profile,
    year,
    month,
    days: file.days,
    todayHijri: current.hijri,
  });

  if (flags.json === true) {
    deps.writer.out(renderCalendarJson(view));
    return;
  }

  const humanOptions = {
    color: deps.colorEnabled && flags.plain !== true,
    ascii: !deps.unicode,
  };
  deps.writer.out(
    flags.plain === true
      ? renderCalendarPlain(view, humanOptions)
      : renderCalendarCard(view, humanOptions),
  );
}

function parseMonth(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const month = Number(value);
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new UsageError(`Invalid month "${value}". Use an integer from 1 to 12.`);
  }
  return month;
}

function parseYear(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const year = Number(value);
  if (!Number.isInteger(year) || year < 1) {
    throw new UsageError(`Invalid year "${value}". Use a positive integer.`);
  }
  return year;
}
