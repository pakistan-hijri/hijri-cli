import { describe, expect, it } from "vitest";
import { buildMonthView } from "../../src/domain/month.js";
import type { MonthView } from "../../src/domain/month.js";
import type { Confidence, HijriDay } from "../../src/domain/types.js";
import {
  renderCalendarCard,
  renderCalendarJson,
  renderCalendarPlain,
} from "../../src/render/calendar.js";
import { hijriDay, readGolden, writeGolden } from "../support.js";

const options = { color: false, ascii: false };

describe("calendar renderers", () => {
  it("renders the month card", async () => {
    await expectGolden(
      "calendar-card.txt",
      renderCalendarCard(sampleMonth({ today: "1448-06-02" }), options),
    );
  });

  it("renders the plain month", async () => {
    await expectGolden(
      "calendar-plain.txt",
      renderCalendarPlain(sampleMonth({ today: "1448-06-02" }), options),
    );
  });

  it("renders stable month JSON", async () => {
    await expectGolden(
      "calendar-json.json",
      renderCalendarJson(sampleMonth({ today: "1448-06-02" })),
    );
  });

  it("renders Ramadan with its Sehri/Iftar note", async () => {
    const view = sampleMonth({
      month: 9,
      start: "2027-02-08",
      count: 29,
      today: "1448-09-01",
      name: { en: "Ramadan", ur: "رمضان" },
    });
    await expectGolden("calendar-ramadan.txt", renderCalendarCard(view, options));
  });

  it("renders an ASCII fallback without Urdu", async () => {
    await expectGolden(
      "calendar-ascii.txt",
      renderCalendarCard(sampleMonth(), { color: false, ascii: true }),
    );
  });

  it("warns when confidence is mixed", () => {
    const card = renderCalendarCard(
      sampleMonth({ confidence: ["confirmed", "predicted"] }),
      options,
    );
    expect(card).toContain("Confidence: mixed");
    expect(card).toContain("Only confirmed dates are official.");
  });

  it("emits every day once and in order in JSON", () => {
    const payload = JSON.parse(
      renderCalendarJson(sampleMonth()),
    ) as {
      data: { days: { day: number; gregorian: string }[] };
    };
    expect(payload.data.days).toHaveLength(30);
    expect(payload.data.days[0]?.day).toBe(1);
    expect(payload.data.days.at(-1)?.day).toBe(30);
    expect(payload.data.days[0]?.gregorian).toBe("2026-05-28");
  });
});

function sampleMonth(input: {
  month?: number;
  start?: string;
  count?: number;
  today?: string;
  name?: { en: string; ur: string };
  confidence?: Confidence[];
} = {}): MonthView {
  const month = input.month ?? 6;
  const start = input.start ?? "2026-05-28";
  const count = input.count ?? 30;
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
      monthName: input.name ?? { en: "Jumada al-Thani", ur: "جمادی الثانی" },
      confidence:
        input.confidence?.[index % (input.confidence.length || 1)] ??
        "confirmed",
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return buildMonthView({
    city: { id: "karachi", name: "Karachi" },
    profile: "sunni_hanafi",
    year: 1448,
    month,
    days,
    todayHijri: input.today,
  });
}

async function expectGolden(name: string, actual: string): Promise<void> {
  if (process.env.UPDATE_GOLDENS === "1") {
    await writeGolden(name, actual);
  }
  expect(actual).toBe(await readGolden(name));
}
