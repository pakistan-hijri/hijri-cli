/** `hijri calendar`: resolve a Hijri month and choose one renderer. */

import type { HijriApi } from "../api/client.js";
import {
  addDays,
  resolveDisplayDate,
  todayInPakistan,
} from "../domain/calendar.js";
import { buildMonthView } from "../domain/month.js";
import { nextEvent } from "../domain/schedule.js";
import type { CalendarFile } from "../domain/types.js";
import { eventLabel } from "../domain/view.js";
import type { NextView, StatusView } from "../domain/view.js";
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
import type { RtlMode } from "../render/rtl.js";
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
  rtlMode: RtlMode;
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

  let view: ReturnType<typeof buildMonthView>;
  try {
    view = buildMonthView({
      city: { id: config.city, name: civilPrayer.meta.cityName },
      profile: config.profile,
      year,
      month,
      days: file.days,
      todayHijri: current.hijri,
    });
  } catch (error) {
    if (error instanceof DataUnavailableError) {
      throw new OutOfRangeError(error.message, error);
    }
    throw error;
  }

  if (flags.json === true) {
    deps.writer.out(renderCalendarJson(view));
    return;
  }

  const statusRamadan = current.month === 9;
  let statusNext: NextView | null = null;
  const currentNext = nextEvent(now, civilPrayer.day, {
    meta: civilPrayer.meta,
    month: current.month,
  });
  if (currentNext !== null) {
    statusNext = {
      ...currentNext,
      label: eventLabel(currentNext.id, statusRamadan, false),
      isTomorrow: false,
    };
  } else {
    const tomorrowDate = addDays(civilDate, 1);
    const [tomorrowPrayer, tomorrowHijri] = await Promise.all([
      deps.api.prayerDay(config.city, config.profile, tomorrowDate),
      deps.api.calendarDay(tomorrowDate),
    ]);
    const tomorrowNext = nextEvent(now, tomorrowPrayer.day, {
      meta: tomorrowPrayer.meta,
      month: tomorrowHijri.month,
    });
    if (tomorrowNext !== null) {
      statusNext = {
        ...tomorrowNext,
        label: eventLabel(
          tomorrowNext.id,
          tomorrowHijri.month === 9,
          true,
        ),
        isTomorrow: true,
      };
    }
  }
  const status: StatusView = {
    profile: config.profile,
    next: statusNext,
    ramadan: statusRamadan,
  };

  const humanOptions = {
    color: deps.colorEnabled && flags.plain !== true,
    ascii: !deps.unicode,
    rtlMode: deps.rtlMode,
    format: config.timeFormat,
    status,
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
