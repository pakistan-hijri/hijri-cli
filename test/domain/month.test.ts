import { describe, expect, it } from "vitest";
import type { Confidence, HijriDay } from "../../src/domain/types.js";
import { buildMonthView } from "../../src/domain/month.js";
import { DataUnavailableError } from "../../src/errors.js";
import { hijriDay } from "../support.js";

const base = {
  city: { id: "karachi", name: "Karachi" },
  profile: "sunni_hanafi",
  year: 1448,
  month: 6,
} as const;

describe("buildMonthView", () => {
  it.each([
    { count: 29, end: "2026-06-25", trailing: 3, label: "29-day month" },
    { count: 30, end: "2026-06-26", trailing: 2, label: "30-day month" },
  ])("builds a Monday-first grid for a $label", ({ count, end, trailing }) => {
    const view = buildMonthView({
      ...base,
      days: daysFor({ count }),
      todayHijri: undefined,
    });

    expect(view.weeks).toHaveLength(5);
    expect(view.weeks[0]?.slice(0, 3)).toEqual([null, null, null]);
    expect(view.weeks[0]?.[3]?.hijri).toBe("1448-06-01");
    expect(view.weeks.at(-1)?.filter((cell) => cell === null)).toHaveLength(
      trailing,
    );
    expect(view.gregorianStart).toBe("2026-05-28");
    expect(view.gregorianEnd).toBe(end);
    expect(view.today).toBeNull();
  });

  it("marks the resolved current day only when it is in the month", () => {
    const days = daysFor({ count: 30 });
    const inside = buildMonthView({
      ...base,
      days,
      todayHijri: "1448-06-02",
    });
    const outside = buildMonthView({
      ...base,
      days,
      todayHijri: "1448-07-01",
    });

    expect(inside.today).toBe("1448-06-02");
    expect(inside.weeks[0]?.filter((cell) => cell?.today)).toHaveLength(1);
    expect(outside.today).toBeNull();
    expect(outside.weeks.flat().some((cell) => cell?.today)).toBe(false);
  });

  it.each([
    { values: ["confirmed"], expected: "confirmed", label: "single value" },
    {
      values: ["confirmed", "predicted"],
      expected: "mixed",
      label: "different values",
    },
  ] as { values: Confidence[]; expected: string; label: string }[])(
    "summarizes confidence for $label",
    ({ values, expected }) => {
      const view = buildMonthView({
        ...base,
        days: daysFor({ count: 30, confidence: values }),
        todayHijri: undefined,
      });
      expect(view.confidence).toBe(expected);
    },
  );

  it("flags Ramadan and keeps the published month names", () => {
    const view = buildMonthView({
      ...base,
      month: 9,
      days: daysFor({
        count: 29,
        month: 9,
        start: "2027-02-08",
        name: { en: "Ramadan", ur: "رمضان" },
      }),
      todayHijri: undefined,
    });
    expect(view.ramadan).toBe(true);
    expect(view.monthName).toEqual({ en: "Ramadan", ur: "رمضان" });
    expect(view.weeks[0]?.every((cell) => cell === null)).toBe(false);
  });

  it("ignores days outside the requested year and month", () => {
    const days = {
      ...daysFor({ count: 1 }),
      "2026-07-01": hijriDay({ hijri: "1448-07-01", month: 7, day: 1 }),
      "2025-06-27": hijriDay({ hijri: "1447-06-01", year: 1447, day: 1 }),
    };
    expect(buildMonthView({ ...base, days, todayHijri: undefined }).weeks.flat())
      .toHaveLength(7);
  });

  it("rejects an unpublished month", () => {
    expect(() =>
      buildMonthView({ ...base, days: {}, todayHijri: undefined }),
    ).toThrow(DataUnavailableError);
  });
});

function daysFor(input: {
  count: number;
  month?: number;
  start?: string;
  confidence?: Confidence[];
  name?: { en: string; ur: string };
}): Record<string, HijriDay> {
  const days: Record<string, HijriDay> = {};
  const month = input.month ?? base.month;
  const cursor = new Date(`${input.start ?? "2026-05-28"}T00:00:00Z`);
  for (let index = 0; index < input.count; index += 1) {
    const number = index + 1;
    const gregorian = cursor.toISOString().slice(0, 10);
    const monthText = String(month).padStart(2, "0");
    const day = String(number).padStart(2, "0");
    days[gregorian] = hijriDay({
      hijri: `${base.year}-${monthText}-${day}`,
      month,
      day: number,
      monthName: input.name ?? { en: "Jumada al-Thani", ur: "جمادی الثانی" },
      confidence: input.confidence?.[index % (input.confidence.length || 1)] ?? "confirmed",
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}
