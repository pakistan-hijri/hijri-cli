import { describe, expect, it } from "vitest";
import { FileCache } from "../../src/api/cache.js";
import { HijriApi } from "../../src/api/client.js";
import {
  DataError,
  DataUnavailableError,
  NetworkError,
  OutOfRangeError,
  UsageError,
} from "../../src/errors.js";
import { tempDir } from "../support.js";

const BASE = "https://example.test";

const cities = [
  {
    id: "karachi",
    name: "Karachi",
    province: "Sindh",
    latitude: 24.8607,
    longitude: 67.0011,
    elevation: 8,
    timezone: "Asia/Karachi",
  },
  {
    id: "lahore",
    name: "Lahore",
    province: "Punjab",
    latitude: 31.5204,
    longitude: 74.3587,
    elevation: 217,
    timezone: "Asia/Karachi",
  },
];

const index = {
  coverage_start: "2025-06-27",
  generated_at: "2026-11-11T08:47:30.582Z",
  baseline: "islamic-umalqura (Intl)",
  hijri_years: [1448],
  confirmed_days: 532,
};

const calendar = {
  hijri_year: 1448,
  coverage_start: "2025-06-27",
  generated_at: "2026-11-11T08:47:30.582Z",
  baseline: "islamic-umalqura (Intl)",
  days: {
    "2026-11-13": {
      hijri: "1448-06-02",
      year: 1448,
      month: 6,
      day: 2,
      month_name: { en: "Jumada al-Thani", ur: "جمادی الثانی" },
      confidence: "confirmed",
      sources: ["https://example.test/source"],
    },
    "2026-11-14": {
      hijri: "1448-06-03",
      year: 1448,
      month: 6,
      day: 3,
      month_name: { en: "Jumada al-Thani", ur: "جمادی الثانی" },
      confidence: "confirmed",
    },
    "2027-02-08": {
      hijri: "1448-09-01",
      year: 1448,
      month: 9,
      day: 1,
      month_name: { en: "Ramadan", ur: "رمضان" },
      confidence: "predicted",
    },
  },
};

const prayer = {
  city: "karachi",
  city_name: "Karachi",
  province: "Sindh",
  profile: "sunni_hanafi",
  profile_label: "Sunni (Hanafi)",
  year: 2026,
  timezone: "Asia/Karachi",
  generated_at: "2026-11-01T05:53:17.872Z",
  disclaimer: "Calculated prayer times, not observed.",
  sehri_offset_min: 0,
  iftar_offset_min: 0,
  days: {
    "2026-11-13": {
      date: "2026-11-13",
      times: {
        fajr: "2026-11-13T05:28:00+05:00",
        sunrise: "2026-11-13T06:47:00+05:00",
        dhuhr: "2026-11-13T12:16:00+05:00",
        asr: "2026-11-13T16:09:00+05:00",
        maghrib: "2026-11-13T17:45:00+05:00",
        isha: "2026-11-13T19:04:00+05:00",
      },
    },
    "2026-11-14": {
      date: "2026-11-14",
      times: {
        fajr: "2026-11-14T05:29:00+05:00",
        sunrise: "2026-11-14T06:47:00+05:00",
        dhuhr: "2026-11-14T12:16:00+05:00",
        asr: "2026-11-14T16:09:00+05:00",
        maghrib: "2026-11-14T17:45:00+05:00",
        isha: "2026-11-14T19:04:00+05:00",
      },
    },
  },
};

function routes() {
  return new Map<string, () => Response>([
    [`${BASE}/cities.json`, () => json(cities)],
    [`${BASE}/hijri/index.json`, () => json(index)],
    [`${BASE}/hijri/calendar/1448.json`, () => json(calendar)],
    [`${BASE}/prayer/karachi/sunni_hanafi/2026.json`, () => json(prayer)],
  ]);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function fakeFetch(table: Map<string, () => Response>): typeof fetch {
  return (input) => {
    const url = input instanceof Request ? input.url : input.toString();
    const handler = table.get(url);
    return Promise.resolve(
      handler === undefined ? json({ error: "not found" }, 404) : handler(),
    );
  };
}

describe("HijriApi", () => {
  it("validates and maps the city list", async () => {
    const dir = await tempDir();
    const api = createApi(dir.path, fakeFetch(routes()));
    const result = await api.cities();
    expect(result[0]).toMatchObject({ id: "karachi", elevation: 8 });
    expect(result[1]?.name).toBe("Lahore");
    await dir.cleanup();
  });

  it("looks a civil date up through the index and calendar year", async () => {
    const dir = await tempDir();
    const api = createApi(dir.path, fakeFetch(routes()));
    const day = await api.calendarDay("2026-11-13");
    expect(day).toMatchObject({
      hijri: "1448-06-02",
      monthName: { en: "Jumada al-Thani" },
      confidence: "confirmed",
    });
    await dir.cleanup();
  });

  it("rejects dates before coverage without fetching a year", async () => {
    const dir = await tempDir();
    const api = createApi(dir.path, fakeFetch(routes()));
    await expect(api.calendarDay("2025-01-01")).rejects.toBeInstanceOf(
      OutOfRangeError,
    );
    await dir.cleanup();
  });

  it("returns prayer metadata and the requested day", async () => {
    const dir = await tempDir();
    const api = createApi(dir.path, fakeFetch(routes()));
    const result = await api.prayerDay(
      "karachi",
      "sunni_hanafi",
      "2026-11-13",
    );
    expect(result.meta.cityName).toBe("Karachi");
    expect(result.day.times.maghrib).toBe("2026-11-13T17:45:00+05:00");
    await dir.cleanup();
  });

  it("maps a missing prayer year to data unavailable", async () => {
    const dir = await tempDir();
    const api = createApi(dir.path, fakeFetch(new Map()));
    await expect(
      api.prayerDay("karachi", "sunni_hanafi", "2026-11-13"),
    ).rejects.toBeInstanceOf(DataUnavailableError);
    await dir.cleanup();
  });

  it("reports invalid payloads instead of returning partial data", async () => {
    const dir = await tempDir();
    const table = routes();
    table.set(`${BASE}/hijri/calendar/1448.json`, () =>
      json({ ...calendar, days: { "2026-11-13": { hijri: "bad" } } }),
    );
    const api = createApi(dir.path, fakeFetch(table));
    await expect(api.calendarDay("2026-11-13")).rejects.toBeInstanceOf(
      DataError,
    );
    await dir.cleanup();
  });

  it("serves stale cache with a warning when the network fails", async () => {
    const dir = await tempDir();
    const cache = createCache(dir.path, () => new Date("2026-11-13T00:00:00Z"));
    const warnings: string[] = [];
    const first = new HijriApi({
      baseUrl: BASE,
      cache,
      fetch: fakeFetch(routes()),
      warn: (message) => warnings.push(message),
    });
    await first.prayerDay("karachi", "sunni_hanafi", "2026-11-13");

    const second = new HijriApi({
      baseUrl: BASE,
      cache: createCache(dir.path, () => new Date("2027-01-01T00:00:00Z")),
      fetch: () => Promise.reject(new Error("offline")),
      warn: (message) => warnings.push(message),
    });
    const result = await second.prayerDay(
      "karachi",
      "sunni_hanafi",
      "2026-11-13",
    );
    expect(result.day.date).toBe("2026-11-13");
    expect(warnings[0]).toContain("stale cache");
    await dir.cleanup();
  });

  it("fails in offline mode when nothing is cached", async () => {
    const dir = await tempDir();
    const cache = createCache(dir.path, () => new Date("2026-11-13T00:00:00Z"));
    const api = new HijriApi({
      baseUrl: BASE,
      cache,
      fetch: fakeFetch(routes()),
      warn: () => undefined,
      offline: true,
    });
    await expect(api.cities()).rejects.toBeInstanceOf(NetworkError);
    await dir.cleanup();
  });

  it("rejects unknown city ids with the accepted list", async () => {
    const dir = await tempDir();
    const api = createApi(dir.path, fakeFetch(routes()));
    await expect(api.requireCity("nowhere")).rejects.toBeInstanceOf(UsageError);
    await expect(api.requireCity("nowhere")).rejects.toThrow("karachi, lahore");
    await dir.cleanup();
  });
});

function createCache(dir: string, now: () => Date): FileCache {
  return new FileCache({ dir, now, warn: () => undefined });
}

function createApi(dir: string, fetchImpl: typeof fetch): HijriApi {
  return new HijriApi({
    baseUrl: BASE,
    cache: createCache(dir, () => new Date("2026-11-13T00:00:00Z")),
    fetch: fetchImpl,
    warn: () => undefined,
  });
}
