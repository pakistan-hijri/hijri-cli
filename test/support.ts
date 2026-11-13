import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { HijriDay, PrayerDay, PrayerMeta } from "../src/domain/types.js";

export const NOW_BEFORE_MAGHRIB = new Date("2026-11-13T07:00:00.000Z");
export const NOW_AFTER_MAGHRIB = new Date("2026-11-13T13:00:00.000Z");

export const SAMPLE_TIMES = {
  fajr: "2026-11-13T05:28:00+05:00",
  sunrise: "2026-11-13T06:47:00+05:00",
  dhuhr: "2026-11-13T12:16:00+05:00",
  asr: "2026-11-13T16:09:00+05:00",
  maghrib: "2026-11-13T17:45:00+05:00",
  isha: "2026-11-13T19:04:00+05:00",
} as const;

export function prayerDay(
  date: string,
  times: Partial<PrayerDay["times"]> = {},
): PrayerDay {
  return {
    date,
    times: {
      fajr: `${date}T05:28:00+05:00`,
      sunrise: `${date}T06:47:00+05:00`,
      dhuhr: `${date}T12:16:00+05:00`,
      asr: `${date}T16:09:00+05:00`,
      maghrib: `${date}T17:45:00+05:00`,
      isha: `${date}T19:04:00+05:00`,
      ...times,
    },
  };
}

export function prayerMeta(overrides: Partial<PrayerMeta> = {}): PrayerMeta {
  return {
    city: "karachi",
    cityName: "Karachi",
    province: "Sindh",
    profile: "sunni_hanafi",
    profileLabel: "Sunni (Hanafi)",
    year: 2026,
    timezone: "Asia/Karachi",
    generatedAt: "2026-11-01T05:53:17.872Z",
    disclaimer: "Calculated prayer times, not observed.",
    sehriOffsetMin: 0,
    iftarOffsetMin: 0,
    ...overrides,
  };
}

export function hijriDay(overrides: Partial<HijriDay> = {}): HijriDay {
  return {
    hijri: "1448-06-02",
    year: 1448,
    month: 6,
    day: 2,
    monthName: { en: "Jumada al-Thani", ur: "جمادی الثانی" },
    confidence: "confirmed",
    ...overrides,
  };
}

export interface CapturingWriter {
  stdout: string;
  stderr: string;
  out: (text: string) => void;
  err: (text: string) => void;
}

export function capturingWriter(): CapturingWriter {
  const writer: CapturingWriter = {
    stdout: "",
    stderr: "",
    out(text: string) {
      writer.stdout += text;
    },
    err(text: string) {
      writer.stderr += text;
    },
  };
  return writer;
}

export async function tempDir(): Promise<{
  path: string;
  cleanup: () => Promise<void>;
}> {
  const path = await mkdtemp(join(tmpdir(), "hijri-cli-test-"));
  return {
    path,
    cleanup: () => rm(path, { recursive: true, force: true }),
  };
}

export async function readGolden(name: string): Promise<string> {
  return readFile(join("testdata", name), "utf8");
}

export async function writeGolden(name: string, value: string): Promise<void> {
  await mkdir("testdata", { recursive: true });
  await writeFile(join("testdata", name), value, "utf8");
}
