import { describe, expect, it } from "vitest";
import {
  addMinutes,
  nextEvent,
  orderedEvents,
  sehriIftar,
} from "../../src/domain/schedule.js";
import { prayerDay, prayerMeta } from "../support.js";

describe("orderedEvents", () => {
  it("uses the canonical prayer order", () => {
    expect(orderedEvents(prayerDay("2026-11-13")).map((event) => event.id)).toEqual(
      ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"],
    );
  });
});

describe("nextEvent", () => {
  const day = prayerDay("2026-11-13");

  it.each([
    ["2026-11-13T05:00:00+05:00", "fajr"],
    ["2026-11-13T05:28:00+05:00", "sunrise"],
    ["2026-11-13T12:00:00+05:00", "dhuhr"],
    ["2026-11-13T16:09:00+05:00", "maghrib"],
    ["2026-11-13T18:00:00+05:00", "isha"],
  ])("at %s the next event is %s", (now, expected) => {
    expect(nextEvent(new Date(now), day)?.id).toBe(expected);
  });

  it("returns null after the last event", () => {
    expect(nextEvent(new Date("2026-11-13T19:04:00+05:00"), day)).toBeNull();
  });

  it("rounds the countdown up to whole minutes", () => {
    const event = nextEvent(new Date("2026-11-13T12:15:01+05:00"), day);
    expect(event).toMatchObject({ id: "dhuhr", minutes: 1 });
  });

  it("uses the offset-adjusted Sehri during Ramadan", () => {
    const ramadanDay = prayerDay("2027-02-08", {
      fajr: "2027-02-08T06:02:00+05:00",
    });
    const event = nextEvent(
      new Date("2027-02-08T05:00:00+05:00"),
      ramadanDay,
      { meta: prayerMeta({ sehriOffsetMin: -10 }), month: 9 },
    );
    expect(event).toMatchObject({
      id: "fajr",
      at: addMinutes(ramadanDay.times.fajr, -10),
    });
  });
});

describe("sehriIftar", () => {
  const day = prayerDay("2027-02-08");

  it("returns null outside Ramadan", () => {
    expect(sehriIftar(day, prayerMeta(), 8)).toBeNull();
  });

  it("applies the published offsets", () => {
    expect(
      sehriIftar(day, prayerMeta({ sehriOffsetMin: -10, iftarOffsetMin: 2 }), 9),
    ).toEqual({
      sehriEnds: addMinutes(day.times.fajr, -10),
      iftar: addMinutes(day.times.maghrib, 2),
    });
  });
});

describe("addMinutes", () => {
  it("preserves the instant when the input is invalid", () => {
    expect(addMinutes("not-a-date", 5)).toBe("not-a-date");
  });
});
