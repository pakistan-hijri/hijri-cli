import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { HijriApi } from "../../src/api/client.js";
import { runToday } from "../../src/commands/today.js";
import { runConfig } from "../../src/commands/config.js";
import { runSetup } from "../../src/commands/setup.js";
import { loadConfig } from "../../src/config/config.js";
import {
  DataUnavailableError,
  UsageError,
} from "../../src/errors.js";
import type { OnboardPrompts } from "../../src/onboard/prompts.js";
import {
  capturingWriter,
  hijriDay,
  prayerDay,
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

function fakeApi(
  days: Record<string, ReturnType<typeof prayerDay>> = {},
  calls: unknown[][] = [],
): Pick<
  HijriApi,
  "cities" | "requireCity" | "calendarDay" | "prayerDay"
> {
  return {
    cities: () => Promise.resolve([city]),
    requireCity: (id: string) =>
      id === "karachi"
        ? Promise.resolve(city)
        : Promise.reject(new UsageError(`Unknown city "${id}".`)),
    calendarDay: (date: string) => {
      const day = hijriFor(date);
      return day === undefined
        ? Promise.reject(new DataUnavailableError(`No Hijri day for ${date}.`))
        : Promise.resolve(day);
    },
    prayerDay: (cityId: string, profile: string, date: string) => {
      calls.push([cityId, profile, date]);
      const day = days[date] ?? (date === "2026-11-13" ? prayerDay(date) : undefined);
      return day === undefined
        ? Promise.reject(
            new DataUnavailableError(`No prayer times for ${cityId} on ${date}.`),
          )
        : Promise.resolve({ day, meta: prayerMeta() });
    },
  };
}

function hijriFor(date: string) {
  if (date === "2026-11-13") {
    return hijriDay();
  }
  if (date === "2026-11-14") {
    return hijriDay({ hijri: "1448-06-03", day: 3 });
  }
  return undefined;
}

function prompts(result: { city: string; profile: "sunni_hanafi" } | null): OnboardPrompts {
  return {
    intro: () => undefined,
    outro: () => undefined,
    selectCity: () => Promise.resolve(result?.city ?? null),
    selectProfile: () => Promise.resolve(result?.profile ?? null),
  };
}

describe("runToday", () => {
  it("uses defaults with a stderr warning outside a TTY", async () => {
    const dir = await tempDir();
    const writer = capturingWriter();
    await runToday(
      {},
      {
        api: fakeApi(),
        configPath: join(dir.path, "config.json"),
        prompts: prompts(null),
        writer,
        now: () => new Date("2026-11-13T07:00:00.000Z"),
        isTTY: false,
        colorEnabled: false,
        unicode: true,
      },
    );

    expect(writer.stdout).toContain("H I J R I");
    expect(writer.stdout).toContain("2 Jumada al-Thani 1448 AH");
    expect(writer.stderr).toContain("No saved configuration");
    await dir.cleanup();
  });

  it("prints JSON with no human decoration", async () => {
    const dir = await tempDir();
    const writer = capturingWriter();
    await runToday(
      { json: true },
      {
        api: fakeApi(),
        configPath: join(dir.path, "config.json"),
        prompts: prompts(null),
        writer,
        now: () => new Date("2026-11-13T07:00:00.000Z"),
        isTTY: false,
        colorEnabled: false,
        unicode: true,
      },
    );

    const payload = JSON.parse(writer.stdout) as {
      ok: boolean;
      data: { next: { name: string } };
    };
    expect(payload.ok).toBe(true);
    expect(payload.data.next.name).toBe("dhuhr");
    expect(writer.stdout).not.toContain("Hijri ·");
    await dir.cleanup();
  });

  it("advances the display date after Maghrib", async () => {
    const dir = await tempDir();
    const writer = capturingWriter();
    await runToday(
      {},
      {
        api: fakeApi({
          "2026-11-13": prayerDay("2026-11-13"),
          "2026-11-14": prayerDay("2026-11-14"),
        }),
        configPath: join(dir.path, "config.json"),
        prompts: prompts(null),
        writer,
        now: () => new Date("2026-11-13T13:00:00.000Z"),
        isTTY: false,
        colorEnabled: false,
        unicode: true,
      },
    );

    expect(writer.stdout).toContain("Showing 2026-11-14 (after Maghrib)");
    expect(writer.stdout).toContain("3 Jumada al-Thani 1448 AH");
    await dir.cleanup();
  });

  it("honours a one-off explicit date without saving config", async () => {
    const dir = await tempDir();
    const writer = capturingWriter();
    const configPath = join(dir.path, "config.json");
    await runToday(
      { date: "2026-11-14" },
      {
        api: fakeApi({ "2026-11-14": prayerDay("2026-11-14") }),
        configPath,
        prompts: prompts(null),
        writer,
        now: () => new Date("2026-11-13T07:00:00.000Z"),
        isTTY: false,
        colorEnabled: false,
        unicode: true,
      },
    );

    expect(writer.stdout).toContain("Date lookup: no countdown.");
    await expect(readFile(configPath, "utf8")).rejects.toThrow();
    await dir.cleanup();
  });

  it("runs onboarding on an interactive first run and persists it", async () => {
    const dir = await tempDir();
    const writer = capturingWriter();
    const configPath = join(dir.path, "config.json");
    await runToday(
      {},
      {
        api: fakeApi(),
        configPath,
        prompts: prompts({ city: "karachi", profile: "sunni_hanafi" }),
        writer,
        now: () => new Date("2026-11-13T07:00:00.000Z"),
        isTTY: true,
        colorEnabled: false,
        unicode: true,
      },
    );

    const saved = await loadConfig(configPath);
    expect(saved.config).toMatchObject({
      city: "karachi",
      profile: "sunni_hanafi",
    });
    expect(writer.stdout).toContain("H I J R I");
    await dir.cleanup();
  });

  it("rejects an invalid date", async () => {
    const dir = await tempDir();
    await expect(
      runToday(
        { date: "2026-02-29" },
        {
          api: fakeApi(),
          configPath: join(dir.path, "config.json"),
          prompts: prompts(null),
          writer: capturingWriter(),
          now: () => new Date("2026-11-13T07:00:00.000Z"),
          isTTY: false,
          colorEnabled: false,
          unicode: true,
        },
      ),
    ).rejects.toBeInstanceOf(UsageError);
    await dir.cleanup();
  });

  it("formats card times in 24-hour form for --24h", async () => {
    const dir = await tempDir();
    const writer = capturingWriter();
    await runToday(
      { h24: true },
      {
        api: fakeApi(),
        configPath: join(dir.path, "config.json"),
        prompts: prompts(null),
        writer,
        now: () => new Date("2026-11-13T07:00:00.000Z"),
        isTTY: false,
        colorEnabled: false,
        unicode: true,
      },
    );

    expect(writer.stdout).toContain("16:09");
    expect(writer.stdout).not.toContain("4:09 PM");
    await dir.cleanup();
  });

  it("uses one-off city and profile flags without saving them", async () => {
    const dir = await tempDir();
    const calls: unknown[][] = [];
    const configPath = join(dir.path, "config.json");
    await runToday(
      { city: "karachi", profile: "shia_jafari" },
      {
        api: fakeApi({}, calls),
        configPath,
        prompts: prompts(null),
        writer: capturingWriter(),
        now: () => new Date("2026-11-13T07:00:00.000Z"),
        isTTY: false,
        colorEnabled: false,
        unicode: true,
      },
    );

    expect(calls).toContainEqual(["karachi", "shia_jafari", "2026-11-13"]);
    await expect(readFile(configPath, "utf8")).rejects.toThrow();
    await dir.cleanup();
  });

  it("keeps the civil date for --midnight after Maghrib", async () => {
    const dir = await tempDir();
    const writer = capturingWriter();
    await runToday(
      { midnight: true },
      {
        api: fakeApi({
          "2026-11-13": prayerDay("2026-11-13"),
          "2026-11-14": prayerDay("2026-11-14"),
        }),
        configPath: join(dir.path, "config.json"),
        prompts: prompts(null),
        writer,
        now: () => new Date("2026-11-13T13:00:00.000Z"),
        isTTY: false,
        colorEnabled: false,
        unicode: true,
      },
    );

    expect(writer.stdout).toContain("2 Jumada al-Thani 1448 AH");
    expect(writer.stdout).not.toContain("after Maghrib");
    await dir.cleanup();
  });

  it("rejects conflicting date convention flags", async () => {
    const dir = await tempDir();
    await expect(
      runToday(
        { midnight: true, afterMaghrib: true },
        {
          api: fakeApi(),
          configPath: join(dir.path, "config.json"),
          prompts: prompts(null),
          writer: capturingWriter(),
          now: () => new Date("2026-11-13T07:00:00.000Z"),
          isTTY: false,
          colorEnabled: false,
          unicode: true,
        },
      ),
    ).rejects.toBeInstanceOf(UsageError);
    await dir.cleanup();
  });

  it("lets --json win over --plain", async () => {
    const dir = await tempDir();
    const writer = capturingWriter();
    await runToday(
      { json: true, plain: true },
      {
        api: fakeApi(),
        configPath: join(dir.path, "config.json"),
        prompts: prompts(null),
        writer,
        now: () => new Date("2026-11-13T07:00:00.000Z"),
        isTTY: false,
        colorEnabled: false,
        unicode: true,
      },
    );

    expect(JSON.parse(writer.stdout)).toMatchObject({ ok: true });
    expect(writer.stdout).not.toContain("Hijri ·");
    await dir.cleanup();
  });
});

describe("runConfig", () => {
  it("shows defaults without calling the API", async () => {
    const dir = await tempDir();
    const writer = capturingWriter();
    await runConfig(
      {},
      {
        api: fakeApi(),
        configPath: join(dir.path, "config.json"),
        writer,
      },
    );
    expect(writer.stdout).toContain("source: defaults");
    await dir.cleanup();
  });

  it("validates and saves a city", async () => {
    const dir = await tempDir();
    const writer = capturingWriter();
    const configPath = join(dir.path, "config.json");
    await runConfig(
      { city: "karachi", timeFormat: "24h" },
      { api: fakeApi(), configPath, writer },
    );
    expect((await loadConfig(configPath)).config).toMatchObject({
      city: "karachi",
      timeFormat: "24h",
    });
    expect(writer.stdout).toContain("source: saved");
    await dir.cleanup();
  });

  it("rejects --clear with a setter", async () => {
    const dir = await tempDir();
    await expect(
      runConfig(
        { clear: true, city: "karachi" },
        {
          api: fakeApi(),
          configPath: join(dir.path, "config.json"),
          writer: capturingWriter(),
        },
      ),
    ).rejects.toBeInstanceOf(UsageError);
    await dir.cleanup();
  });

  it("clears saved configuration", async () => {
    const dir = await tempDir();
    const writer = capturingWriter();
    const configPath = join(dir.path, "config.json");
    await runConfig({ city: "karachi" }, { api: fakeApi(), configPath, writer });
    await runConfig({ clear: true }, { api: fakeApi(), configPath, writer });
    expect((await loadConfig(configPath)).config).toBeUndefined();
    await dir.cleanup();
  });
});

describe("runSetup", () => {
  it("rejects a non-TTY setup", async () => {
    const dir = await tempDir();
    await expect(
      runSetup({
        api: fakeApi(),
        configPath: join(dir.path, "config.json"),
        prompts: prompts(null),
        writer: capturingWriter(),
        isTTY: false,
      }),
    ).rejects.toBeInstanceOf(UsageError);
    await dir.cleanup();
  });

  it("saves the selected city and profile", async () => {
    const dir = await tempDir();
    const configPath = join(dir.path, "config.json");
    const writer = capturingWriter();
    await runSetup({
      api: fakeApi(),
      configPath,
      prompts: prompts({ city: "karachi", profile: "sunni_hanafi" }),
      writer,
      isTTY: true,
    });
    expect((await loadConfig(configPath)).config).toMatchObject({
      city: "karachi",
      profile: "sunni_hanafi",
    });
    expect(writer.stdout).toContain("Saved: Karachi");
    await dir.cleanup();
  });
});
