/** `hijri`: resolve today, build the view, and choose one renderer. */

import { DEFAULT_CONFIG, loadConfig, resolveConfig, saveConfig } from "../config/config.js";
import {
  addDays,
  isValidIsoDate,
  resolveDisplayDate,
  todayInPakistan,
} from "../domain/calendar.js";
import type { Convention } from "../domain/types.js";
import type { ProfileId } from "../domain/profiles.js";
import { isProfileId, PROFILE_IDS } from "../domain/profiles.js";
import { nextEvent } from "../domain/schedule.js";
import type { NextEvent } from "../domain/types.js";
import { buildTodayView } from "../domain/view.js";
import { CancelledError, DataUnavailableError, UsageError } from "../errors.js";
import type { HijriApi } from "../api/client.js";
import type { OnboardPrompts } from "../onboard/prompts.js";
import { runOnboarding } from "../onboard/flow.js";
import { renderJsonSuccess } from "../render/json.js";
import { renderCard, renderPlain } from "../render/today.js";
import type { Writer } from "../render/writer.js";

export interface TodayFlags {
  city?: string;
  profile?: string;
  date?: string;
  midnight?: boolean;
  afterMaghrib?: boolean;
  h24?: boolean;
  json?: boolean;
  plain?: boolean;
}

export interface TodayDeps {
  api: Pick<
    HijriApi,
    "cities" | "requireCity" | "calendarDay" | "prayerDay"
  >;
  configPath: string;
  prompts: OnboardPrompts;
  writer: Writer;
  now: () => Date;
  isTTY: boolean;
  colorEnabled: boolean;
  unicode: boolean;
}

export async function runToday(
  flags: TodayFlags,
  deps: TodayDeps,
): Promise<void> {
  if (flags.midnight === true && flags.afterMaghrib === true) {
    throw new UsageError("Use either --midnight or --after-maghrib, not both.");
  }

  const loaded = await loadConfig(deps.configPath);
  let saved = loaded.config;

  if (saved === undefined) {
    if (deps.isTTY) {
      const cities = await deps.api.cities();
      const result = await runOnboarding(cities, deps.prompts);
      if (result === null) {
        throw new CancelledError();
      }
      saved = {
        ...DEFAULT_CONFIG,
        city: result.city,
        profile: result.profile,
      };
      await saveConfig(deps.configPath, saved);
    } else {
      deps.writer.err(
        "No saved configuration; using Karachi and sunni_hanafi. Run \"hijri setup\" to choose.\n",
      );
    }
  }

  const profile = parseProfile(flags.profile);
  if (flags.city !== undefined) {
    await deps.api.requireCity(flags.city);
  }

  const convention = parseConvention(flags);
  const config = resolveConfig(
    {
      ...(flags.city === undefined ? {} : { city: flags.city }),
      ...(profile === undefined ? {} : { profile }),
      ...(convention === undefined ? {} : { convention }),
      ...(flags.h24 === true ? { timeFormat: "24h" as const } : {}),
    },
    saved,
  );

  if (flags.date !== undefined && !isValidIsoDate(flags.date)) {
    throw new UsageError(
      `Invalid date "${flags.date}". Use a real date in YYYY-MM-DD form.`,
    );
  }

  const now = deps.now();
  const civilDate = todayInPakistan(now);
  const explicitDate = flags.date !== undefined;
  let displayDate = flags.date ?? civilDate;
  let afterMaghrib = false;

  if (!explicitDate) {
    const civil = await deps.api.prayerDay(
      config.city,
      config.profile,
      civilDate,
    );
    const rollover = resolveDisplayDate({
      now,
      civilDate,
      convention: config.convention,
      maghrib: civil.day.times.maghrib,
      explicitDate: false,
    });
    displayDate = rollover.displayDate;
    afterMaghrib = rollover.afterMaghrib;
  }

  const [hijri, prayer] = await Promise.all([
    deps.api.calendarDay(displayDate),
    deps.api.prayerDay(config.city, config.profile, displayDate),
  ]);

  const showNext = !explicitDate || displayDate === civilDate;
  let next: (NextEvent & { isTomorrow: boolean; ramadan: boolean }) | null =
    null;

  if (showNext) {
    const current = nextEvent(now, prayer.day);
    if (current !== null) {
      next = {
        ...current,
        isTomorrow: false,
        ramadan: hijri.month === 9,
      };
    } else {
      const tomorrowDate = addDays(displayDate, 1);
      const [tomorrowPrayer, tomorrowHijri] = await Promise.all([
        deps.api.prayerDay(config.city, config.profile, tomorrowDate),
        deps.api.calendarDay(tomorrowDate),
      ]);
      const tomorrow = nextEvent(now, tomorrowPrayer.day);
      if (tomorrow !== null) {
        next = {
          ...tomorrow,
          isTomorrow: true,
          ramadan: tomorrowHijri.month === 9,
        };
      }
    }
  }

  if (showNext && next === null) {
    throw new DataUnavailableError(
      `Could not find the next prayer after ${displayDate}.`,
    );
  }

  const view = buildTodayView({
    city: { id: prayer.meta.city, name: prayer.meta.cityName },
    profile: config.profile,
    gregorian: displayDate,
    hijri,
    afterMaghrib,
    explicitDate,
    prayer: prayer.day,
    meta: prayer.meta,
    next,
  });

  if (flags.json === true) {
    deps.writer.out(renderJsonSuccess(view));
    return;
  }

  const humanOptions = {
    format: config.timeFormat,
    color: deps.colorEnabled && flags.plain !== true,
    ascii: !deps.unicode,
  };

  deps.writer.out(
    flags.plain === true
      ? renderPlain(view, humanOptions)
      : renderCard(view, humanOptions),
  );
}

function parseProfile(value: string | undefined): ProfileId | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!isProfileId(value)) {
    throw new UsageError(
      `Unknown profile "${value}". Accepted profiles: ${PROFILE_IDS.join(", ")}.`,
    );
  }
  return value;
}

function parseConvention(flags: TodayFlags): Convention | undefined {
  if (flags.midnight === true) {
    return "midnight";
  }
  if (flags.afterMaghrib === true) {
    return "after-maghrib";
  }
  return undefined;
}
