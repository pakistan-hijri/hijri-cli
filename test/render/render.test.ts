import { describe, expect, it } from "vitest";
import { renderJsonError, renderJsonSuccess } from "../../src/render/json.js";
import {
  formatCountdown,
  formatTime,
  formatWeekday,
} from "../../src/render/time.js";
import { renderCard, renderPlain } from "../../src/render/today.js";
import { sampleView } from "../fixtures.js";
import { readGolden, writeGolden } from "../support.js";

const options = { format: "12h" as const, color: false, ascii: false };

describe("time formatting", () => {
  it("formats 12-hour and 24-hour times in Asia/Karachi", () => {
    const iso = "2026-11-13T17:45:00+05:00";
    expect(formatTime(iso, "12h")).toBe("5:45 PM");
    expect(formatTime(iso, "24h")).toBe("17:45");
  });

  it("formats countdowns and weekdays", () => {
    expect(formatCountdown(0)).toBe("now");
    expect(formatCountdown(14)).toBe("14m");
    expect(formatCountdown(92)).toBe("1h 32m");
    expect(formatCountdown(120)).toBe("2h");
    expect(formatWeekday("2026-11-13")).toBe("Friday, 13 November 2026");
  });
});

describe("human renderers", () => {
  it("renders the current card", async () => {
    await expectGolden("card-current.txt", renderCard(sampleView(), options));
  });

  it("renders the current plain view", async () => {
    await expectGolden("plain-current.txt", renderPlain(sampleView(), options));
  });

  it("renders the after-Maghrib note", async () => {
    const view = sampleView({
      afterMaghrib: true,
      gregorian: "2026-11-14",
      hijri: {
        date: "1448-06-03",
        day: 3,
        month: 6,
        year: 1448,
        monthName: { en: "Jumada al-Thani", ur: "جمادی الثانی" },
      },
    });
    await expectGolden("card-after-maghrib.txt", renderCard(view, options));
  });

  it("renders Ramadan labels and Sehri/Iftar", async () => {
    const view = sampleView({
      gregorian: "2027-02-08",
      hijri: {
        date: "1448-09-01",
        day: 1,
        month: 9,
        year: 1448,
        monthName: { en: "Ramadan", ur: "رمضان" },
      },
      confidence: "predicted",
      ramadan: true,
      prayers: [
        {
          id: "fajr",
          label: "Sehri ends",
          at: "2027-02-08T05:53:00+05:00",
        },
        {
          id: "sunrise",
          label: "Sunrise",
          at: "2027-02-08T07:11:00+05:00",
        },
        {
          id: "dhuhr",
          label: "Dhuhr",
          at: "2027-02-08T12:46:00+05:00",
        },
        {
          id: "asr",
          label: "Asr",
          at: "2027-02-08T16:45:00+05:00",
        },
        {
          id: "maghrib",
          label: "Iftar",
          at: "2027-02-08T18:22:00+05:00",
        },
        {
          id: "isha",
          label: "Isha",
          at: "2027-02-08T19:39:00+05:00",
        },
      ],
      sehriIftar: {
        sehriEnds: "2027-02-08T05:53:00+05:00",
        iftar: "2027-02-08T18:22:00+05:00",
      },
      next: {
        id: "maghrib",
        label: "Iftar",
        at: "2027-02-08T18:22:00+05:00",
        minutes: 180,
        isTomorrow: false,
      },
    });
    await expectGolden("card-ramadan.txt", renderCard(view, options));
  });

  it("renders an ASCII fallback", async () => {
    await expectGolden(
      "card-ascii.txt",
      renderCard(sampleView(), { ...options, ascii: true }),
    );
  });

  it("right-aligns and isolates the Urdu month name", () => {
    const lines = renderCard(sampleView(), options).split("\n");
    const urdu = lines.find((line) => line.includes("\u2068"));
    expect(urdu?.endsWith("\u2068جمادی الثانی\u2069")).toBe(true);
    expect(urdu?.replace(/[\u2068\u2069]/gu, "").length).toBe(40);
    expect(renderCard(sampleView(), { ...options, ascii: true })).not.toContain(
      "\u2068",
    );
  });

  it("renders the explicit-date note", async () => {
    const view = sampleView({
      gregorian: "2026-11-14",
      next: null,
      explicitDate: true,
      hijri: {
        date: "1448-06-03",
        day: 3,
        month: 6,
        year: 1448,
        monthName: { en: "Jumada al-Thani", ur: "جمادی الثانی" },
      },
    });
    await expectGolden("card-date-lookup.txt", renderCard(view, options));
  });
});

describe("JSON renderers", () => {
  it("renders stable success JSON", async () => {
    await expectGolden("json-current.json", renderJsonSuccess(sampleView()));
  });

  it("renders stable error JSON", async () => {
    await expectGolden(
      "json-error.json",
      renderJsonError("network", "Could not reach example.test."),
    );
  });
});

async function expectGolden(name: string, actual: string): Promise<void> {
  if (process.env.UPDATE_GOLDENS === "1") {
    await writeGolden(name, actual);
  }
  expect(actual).toBe(await readGolden(name));
}
