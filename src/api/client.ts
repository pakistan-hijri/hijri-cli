/** Validated, cached access to the hijri-api contract. */

import { ZodError } from "zod";
import {
  DataError,
  DataUnavailableError,
  NetworkError,
  OutOfRangeError,
  UsageError,
} from "../errors.js";
import type {
  CalendarFile,
  CalendarIndex,
  City,
  HijriDay,
  PrayerDayResult,
  PrayerFile,
} from "../domain/types.js";
import type { ProfileId } from "../domain/profiles.js";
import { gregorianYear } from "../domain/calendar.js";
import type { FileCache } from "./cache.js";
import { fetchJson, HttpError } from "./http.js";
import {
  parseCalendarFile,
  parseCalendarIndex,
  parseCities,
  parsePrayerFile,
} from "./schema.js";
import { candidateYears } from "./year-selection.js";

const TTL = {
  cities: 7 * 24 * 60 * 60 * 1000,
  index: 7 * 24 * 60 * 60 * 1000,
  calendar: 12 * 60 * 60 * 1000,
  prayer: 30 * 24 * 60 * 60 * 1000,
} as const;

export const DEFAULT_BASE_URL = "https://pakistan-hijri.github.io/hijri-api";

export interface ApiDeps {
  baseUrl?: string;
  cache: FileCache;
  fetch: typeof globalThis.fetch;
  warn: (message: string) => void;
  offline?: boolean;
  timeoutMs?: number;
}

export class HijriApi {
  readonly #baseUrl: string;
  readonly #cache: FileCache;
  readonly #fetch: typeof globalThis.fetch;
  readonly #warn: (message: string) => void;
  readonly #offline: boolean;
  readonly #timeoutMs: number | undefined;
  readonly #calendarYears = new Map<number, Promise<CalendarFile>>();
  readonly #prayerYears = new Map<string, Promise<PrayerFile>>();
  #index: Promise<CalendarIndex> | undefined;

  constructor(deps: ApiDeps) {
    this.#baseUrl = (deps.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.#cache = deps.cache;
    this.#fetch = deps.fetch;
    this.#warn = deps.warn;
    this.#offline = deps.offline ?? false;
    this.#timeoutMs = deps.timeoutMs;
  }

  async cities(): Promise<City[]> {
    return this.#load("/cities.json", TTL.cities, parseCities);
  }

  async requireCity(id: string): Promise<City> {
    const cities = await this.cities();
    const city = cities.find((candidate) => candidate.id === id);
    if (city === undefined) {
      const accepted = cities.map((candidate) => candidate.id).join(", ");
      throw new UsageError(`Unknown city "${id}". Accepted cities: ${accepted}.`);
    }
    return city;
  }

  async calendarIndex(): Promise<CalendarIndex> {
    this.#index ??= this.#load(
      "/hijri/index.json",
      TTL.index,
      parseCalendarIndex,
    ).catch((error: unknown) => {
      this.#index = undefined;
      throw error;
    });
    return this.#index;
  }

  calendarYear(year: number): Promise<CalendarFile> {
    return memo(this.#calendarYears, year, () =>
      this.#load(`/hijri/calendar/${year}.json`, TTL.calendar, parseCalendarFile),
    );
  }

  prayerYear(
    city: string,
    profile: ProfileId,
    year: number,
  ): Promise<PrayerFile> {
    const key = `${city}/${profile}/${year}`;
    return memo(this.#prayerYears, key, async () => {
      try {
        return await this.#load(
          `/prayer/${city}/${profile}/${year}.json`,
          TTL.prayer,
          parsePrayerFile,
        );
      } catch (error) {
        if (error instanceof HttpError && error.status === 404) {
          throw new DataUnavailableError(
            `Prayer times for ${city} (${profile}) are not published for ${year}.`,
            error,
          );
        }
        throw error;
      }
    });
  }

  async calendarDay(date: string): Promise<HijriDay> {
    const index = await this.calendarIndex();
    if (
      index.coverageStart !== null &&
      date < index.coverageStart
    ) {
      throw new OutOfRangeError(
        `Hijri data starts at ${index.coverageStart}; ${date} is before coverage.`,
      );
    }

    for (const year of candidateYears(date, index.hijriYears)) {
      let file: CalendarFile;
      try {
        file = await this.calendarYear(year);
      } catch (error) {
        if (error instanceof HttpError && error.status === 404) {
          continue;
        }
        throw error;
      }
      const day = file.days[date];
      if (day !== undefined) {
        return day;
      }
    }

    throw new DataUnavailableError(
      `No published Hijri calendar contains ${date}. The date may be beyond current coverage.`,
    );
  }

  async prayerDay(
    city: string,
    profile: ProfileId,
    date: string,
  ): Promise<PrayerDayResult> {
    const file = await this.prayerYear(city, profile, gregorianYear(date));
    const day = file.days[date];
    if (day === undefined) {
      throw new DataUnavailableError(
        `No prayer times for ${city} (${profile}) on ${date}.`,
      );
    }
    return { day, meta: file.meta };
  }

  async #load<T>(
    path: string,
    ttlMs: number,
    parse: (input: unknown) => T,
  ): Promise<T> {
    const url = this.#url(path);

    if (!this.#offline) {
      const fresh = await this.#cache.getFresh(url, ttlMs);
      if (fresh !== undefined) {
        return validate(parse, fresh.body, path);
      }
    }

    if (this.#offline) {
      const stale = await this.#cache.getStale(url);
      if (stale !== undefined) {
        return validate(parse, stale.body, path);
      }
      throw new NetworkError(
        `Offline mode is on and ${path} has not been cached yet.`,
      );
    }

    try {
      const body = await fetchJson(url, {
        fetch: this.#fetch,
        ...(this.#timeoutMs === undefined ? {} : { timeoutMs: this.#timeoutMs }),
      });
      const value = validate(parse, body, path);
      await this.#cache.set(url, body);
      return value;
    } catch (error) {
      if (error instanceof DataError) {
        throw error;
      }
      if (error instanceof HttpError && error.status < 500) {
        throw error;
      }

      const stale = await this.#cache.getStale(url);
      if (stale !== undefined) {
        const value = validate(parse, stale.body, path);
        this.#warn(
          `Serving stale cache for ${path} (fetched ${stale.fetchedAt}).`,
        );
        return value;
      }
      throw error;
    }
  }

  #url(path: string): string {
    return `${this.#baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  }
}

function validate<T>(
  parse: (input: unknown) => T,
  input: unknown,
  path: string,
): T {
  try {
    return parse(input);
  } catch (error) {
    if (error instanceof ZodError) {
      const issue = error.issues[0];
      const detail =
        issue === undefined
          ? "unexpected shape"
          : `${issue.path.join(".") || "root"}: ${issue.message}`;
      throw new DataError(`Invalid data from ${path} (${detail}).`, error);
    }
    throw error;
  }
}

function memo<K, V>(
  store: Map<K, Promise<V>>,
  key: K,
  load: () => Promise<V>,
): Promise<V> {
  const existing = store.get(key);
  if (existing !== undefined) {
    return existing;
  }
  const promise = load().catch((error: unknown) => {
    store.delete(key);
    throw error;
  });
  store.set(key, promise);
  return promise;
}
