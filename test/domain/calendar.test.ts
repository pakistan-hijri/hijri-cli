import { describe, expect, it } from "vitest";
import {
  addDays,
  estimateHijriYear,
  gregorianYear,
  isValidIsoDate,
  resolveDisplayDate,
  todayInPakistan,
} from "../../src/domain/calendar.js";

describe("todayInPakistan", () => {
  it("uses the Pakistan civil date, not the machine date", () => {
    expect(todayInPakistan(new Date("2026-11-12T20:00:00.000Z"))).toBe(
      "2026-11-13",
    );
    expect(todayInPakistan(new Date("2026-11-13T18:59:59.000Z"))).toBe(
      "2026-11-13",
    );
    expect(todayInPakistan(new Date("2026-11-13T19:00:00.000Z"))).toBe(
      "2026-11-14",
    );
  });
});

describe("addDays", () => {
  it.each([
    ["2026-11-13", 1, "2026-11-14"],
    ["2026-12-31", 1, "2027-01-01"],
    ["2028-02-28", 1, "2028-02-29"],
    ["2026-03-01", -1, "2026-02-28"],
    ["2026-11-13", 0, "2026-11-13"],
  ])("%s + %i = %s", (date, days, expected) => {
    expect(addDays(date, days)).toBe(expected);
  });

  it("extracts the Gregorian year", () => {
    expect(gregorianYear("2027-01-01")).toBe(2027);
  });
});

describe("isValidIsoDate", () => {
  it.each([
    ["2026-11-13", true],
    ["2028-02-29", true],
    ["2026-02-29", false],
    ["2026-13-01", false],
    ["2026-00-10", false],
    ["13-11-2026", false],
    ["2026-1-3", false],
    ["", false],
  ])("%s -> %s", (date, expected) => {
    expect(isValidIsoDate(date)).toBe(expected);
  });
});

describe("estimateHijriYear", () => {
  it("matches the API baseline for the sample date", () => {
    expect(estimateHijriYear("2026-11-13")).toBe(1448);
  });
});

describe("resolveDisplayDate", () => {
  const maghrib = "2026-11-13T17:45:00+05:00";

  it("keeps the civil date before Maghrib", () => {
    expect(
      resolveDisplayDate({
        now: new Date("2026-11-13T17:44:59+05:00"),
        civilDate: "2026-11-13",
        convention: "after-maghrib",
        maghrib,
        explicitDate: false,
      }),
    ).toEqual({ displayDate: "2026-11-13", afterMaghrib: false });
  });

  it("advances exactly at Maghrib", () => {
    expect(
      resolveDisplayDate({
        now: new Date("2026-11-13T17:45:00+05:00"),
        civilDate: "2026-11-13",
        convention: "after-maghrib",
        maghrib,
        explicitDate: false,
      }),
    ).toEqual({ displayDate: "2026-11-14", afterMaghrib: true });
  });

  it("keeps the civil date in midnight mode", () => {
    expect(
      resolveDisplayDate({
        now: new Date("2026-11-13T23:00:00+05:00"),
        civilDate: "2026-11-13",
        convention: "midnight",
        maghrib,
        explicitDate: false,
      }),
    ).toEqual({ displayDate: "2026-11-13", afterMaghrib: false });
  });

  it("never rolls an explicit date", () => {
    expect(
      resolveDisplayDate({
        now: new Date("2026-11-13T23:00:00+05:00"),
        civilDate: "2026-03-01",
        convention: "after-maghrib",
        maghrib,
        explicitDate: true,
      }),
    ).toEqual({ displayDate: "2026-03-01", afterMaghrib: false });
  });

  it("does not invent a boundary when Maghrib is missing", () => {
    expect(
      resolveDisplayDate({
        now: new Date("2026-11-13T23:00:00+05:00"),
        civilDate: "2026-11-13",
        convention: "after-maghrib",
        maghrib: undefined,
        explicitDate: false,
      }),
    ).toEqual({ displayDate: "2026-11-13", afterMaghrib: false });
  });
});
