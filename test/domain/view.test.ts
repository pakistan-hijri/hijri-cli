import { describe, expect, it } from "vitest";
import { addMinutes } from "../../src/domain/schedule.js";
import { buildTodayView } from "../../src/domain/view.js";
import { prayerDay, prayerMeta } from "../support.js";

describe("buildTodayView", () => {
  it("shows the offset-adjusted Sehri and Iftar on the prayer rows", () => {
    const prayer = prayerDay("2027-02-08", {
      fajr: "2027-02-08T06:02:00+05:00",
      maghrib: "2027-02-08T18:36:00+05:00",
    });
    const meta = prayerMeta({ sehriOffsetMin: -10, iftarOffsetMin: 2 });

    const view = buildTodayView({
      city: { id: "karachi", name: "Karachi" },
      profile: "shia_jafari",
      gregorian: "2027-02-08",
      hijri: {
        hijri: "1448-09-01",
        year: 1448,
        month: 9,
        day: 1,
        monthName: { en: "Ramadan", ur: "رمضان" },
        confidence: "predicted",
      },
      afterMaghrib: false,
      explicitDate: false,
      prayer,
      meta,
      next: null,
    });

    const sehriEnds = addMinutes(prayer.times.fajr, -10);
    const iftar = addMinutes(prayer.times.maghrib, 2);

    expect(view.sehriIftar).toEqual({ sehriEnds, iftar });
    expect(view.prayers.find((row) => row.id === "fajr")).toEqual({
      id: "fajr",
      label: "Sehri ends",
      at: sehriEnds,
    });
    expect(view.prayers.find((row) => row.id === "maghrib")).toEqual({
      id: "maghrib",
      label: "Iftar",
      at: iftar,
    });
  });

  it("keeps raw prayer times outside Ramadan", () => {
    const prayer = prayerDay("2026-11-13");
    const view = buildTodayView({
      city: { id: "karachi", name: "Karachi" },
      profile: "sunni_hanafi",
      gregorian: "2026-11-13",
      hijri: {
        hijri: "1448-06-02",
        year: 1448,
        month: 6,
        day: 2,
        monthName: { en: "Jumada al-Thani", ur: "جمادی الثانی" },
        confidence: "confirmed",
      },
      afterMaghrib: false,
      explicitDate: false,
      prayer,
      meta: prayerMeta(),
      next: null,
    });

    expect(view.sehriIftar).toBeNull();
    expect(view.prayers.find((row) => row.id === "fajr")?.at).toBe(
      prayer.times.fajr,
    );
  });
});
