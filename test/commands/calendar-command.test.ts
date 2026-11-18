import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { HijriApi } from "../../src/api/client.js";
import { runCalendar } from "../../src/commands/calendar.js";
import type { Confidence, HijriDay } from "../../src/domain/types.js";
import {
  DataUnavailableError,
  OutOfRangeError,
  UsageError,
} from "../../src/errors.js";
import type { OnboardPrompts } from "../../src/onboard/prompts.js";
import {
  capturingWriter,
  hijriDay,
  prayerDay as makePrayerDay,
  prayerMeta,
  tempDir,
} from "../support.js";

const city = {
  id: "karachi",
  name: "Karachi",
  province: "Sindh",
  latitude: 24.8607,
  longitude: 67.0011,
  timezone: "Asia/Karachi",
};

const index = {
  coverageStart: "2025-06-27",
  generatedAt: "2026-11-01T00:00:00Z",
  baseline: "islamic-umalqura",
  hijriYears: [1447, 1448, 1449],
};

function fakeApi(): Pick<
  HijriApi,
  | "cities"
  | "requireCity"
  | "calendarIndex"
  | "calendarYear"
  | "calendarDay"
  | "prayerDay"
> {
  const days = {
    ...daysFor(6, 30, "2026-05-28", { en: "Jumada al-Thani", ur: "جمادی الثانی" }),
    ...daysFor(9, 29, "2027-02-08", { en: "Ramadan", ur: "رمضان" }, [
      "confirmed",
      "predicted",
    ]),
  };
  return {
    cities: () => Promise.resolve([city]),
    requireCity: (id: string) =>
      id === "karachi"
        ? Promise.resolve(city)
        : Promise.reject(new UsageError(`Unknown city "${id}".`)),
    calendarIndex: () => Promise.resolve(index),
    calendarYear: (year: number) =>
      year === 1448
        ? Promise.resolve({
            hijriYear: 1448,
            coverageStart: null,
            generatedAt: index.generatedAt,
            baseline: index.baseline,
            days,
          })
        : Promise.reject(new DataUnavailableError(`No calendar for ${year}.`)),
    calendarDay: (date: string) =>
      date === "2026-11-13"
        ? Promise.resolve(hijriDay())
        : Promise.reject(new DataUnavailableError(`No Hijri day for ${date}.`)),
    prayerDay: () =>
      Promise.resolve({ day: makePrayerDay("2026-11-13"), meta: prayerMeta() }),
  };
}

function prompts(): OnboardPrompts {
  return {
    intro: () => undefined,
    outro: () => undefined,
    selectCity: () => Promise.resolve(null),
    selectProfile: () => Promise.resolve(null),
  };
}

function deps(dirPath: string, writer: ReturnType<typeof capturingWriter>) {
  return {
    api: fakeApi(),
    configPath: join(dirPath, "config.json"),
    prompts: prompts(),
    writer,
    now: () => new Date("2026-11-13T07:00:00.000Z"),
    isTTY: false,
    colorEnabled: false,
    unicode: true,
  };
}

describe("runCalendar", () => {
  it("shows the current Hijri month with a today marker", async () => {
    const dir = await tempDir();
    const writer = capturingWriter();
    await runCalendar({}, deps(dir.path, writer));

    expect(writer.stdout).toContain("Jumada al-Thani 1448 AH");
    expect(writer.stdout).toContain("Mon Tue Wed Thu Fri Sat Sun");
    expect(writer.stdout).toContain("* today");
    expect(writer.stdout).toContain("Confidence: confirmed");
    expect(writer.stderr).toContain("No saved configuration");
    await dir.cleanup();
  });

  it("shows an explicit Ramadan month with its confidence warning", async () => {
    const dir = await tempDir();
    const writer = capturingWriter();
    await runCalendar({ month: "9", year: "1448" }, deps(dir.path, writer));

    expect(writer.stdout).toContain("Ramadan 1448 AH");
    expect(writer.stdout).toContain("Ramadan: Sehri ends at Fajr");
    expect(writer.stdout).toContain("Confidence: mixed");
    expect(writer.stdout).toContain("Only confirmed dates are official.");
    await dir.cleanup();
  });

  it("prints stable JSON with every day", async () => {
    const dir = await tempDir();
    const writer = capturingWriter();
    await runCalendar({ json: true }, deps(dir.path, writer));

    const payload = JSON.parse(writer.stdout) as {
      ok: boolean;
      data: { month: number; today: string; days: unknown[] };
    };
    expect(payload.ok).toBe(true);
    expect(payload.data.month).toBe(6);
    expect(payload.data.today).toBe("1448-06-02");
    expect(payload.data.days).toHaveLength(30);
    expect(writer.stdout).not.toContain("Hijri ·");
    await dir.cleanup();
  });

  it("prints plain output without a card rule", async () => {
    const dir = await tempDir();
    const writer = capturingWriter();
    await runCalendar({ plain: true }, deps(dir.path, writer));

    expect(writer.stdout).toContain("Mon Tue Wed Thu Fri Sat Sun");
    expect(writer.stdout).not.toContain("────");
    await dir.cleanup();
  });

  it.each([
    { flags: { month: "13" }, label: "month out of range" },
    { flags: { month: "ramadan" }, label: "non-numeric month" },
    { flags: { year: "0" }, label: "non-positive year" },
  ])("rejects a $label", async ({ flags }) => {
    const dir = await tempDir();
    await expect(runCalendar(flags, deps(dir.path, capturingWriter()))).rejects
      .toBeInstanceOf(UsageError);
    await dir.cleanup();
  });

  it("rejects an unpublished year", async () => {
    const dir = await tempDir();
    await expect(
      runCalendar({ year: "1500" }, deps(dir.path, capturingWriter())),
    ).rejects.toBeInstanceOf(OutOfRangeError);
    await dir.cleanup();
  });

  it("does not save one-off flags", async () => {
    const dir = await tempDir();
    const configPath = join(dir.path, "config.json");
    await runCalendar({ city: "karachi" }, deps(dir.path, capturingWriter()));
    await expect(readFile(configPath, "utf8")).rejects.toThrow();
    await dir.cleanup();
  });
});

function daysFor(
  month: number,
  count: number,
  start: string,
  monthName: { en: string; ur: string },
  confidence: Confidence[] = ["confirmed"],
): Record<string, HijriDay> {
  const days: Record<string, HijriDay> = {};
  const cursor = new Date(`${start}T00:00:00Z`);
  for (let index = 0; index < count; index += 1) {
    const number = index + 1;
    const gregorian = cursor.toISOString().slice(0, 10);
    const monthText = String(month).padStart(2, "0");
    const day = String(number).padStart(2, "0");
    days[gregorian] = hijriDay({
      hijri: `1448-${monthText}-${day}`,
      year: 1448,
      month,
      day: number,
      monthName,
      confidence: confidence[index % confidence.length] ?? "confirmed",
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}
