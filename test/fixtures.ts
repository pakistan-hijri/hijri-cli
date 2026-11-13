import type { TodayView } from "../src/domain/view.js";
import { SAMPLE_TIMES } from "./support.js";

export function sampleView(overrides: Partial<TodayView> = {}): TodayView {
  return {
    city: { id: "karachi", name: "Karachi" },
    profile: "sunni_hanafi",
    gregorian: "2026-11-13",
    hijri: {
      date: "1448-06-02",
      day: 2,
      month: 6,
      year: 1448,
      monthName: { en: "Jumada al-Thani", ur: "جمادی الثانی" },
    },
    confidence: "confirmed",
    afterMaghrib: false,
    ramadan: false,
    prayers: [
      { id: "fajr", label: "Fajr", at: SAMPLE_TIMES.fajr },
      { id: "sunrise", label: "Sunrise", at: SAMPLE_TIMES.sunrise },
      { id: "dhuhr", label: "Dhuhr", at: SAMPLE_TIMES.dhuhr },
      { id: "asr", label: "Asr", at: SAMPLE_TIMES.asr },
      { id: "maghrib", label: "Maghrib", at: SAMPLE_TIMES.maghrib },
      { id: "isha", label: "Isha", at: SAMPLE_TIMES.isha },
    ],
    sehriIftar: null,
    next: {
      id: "maghrib",
      label: "Maghrib",
      at: SAMPLE_TIMES.maghrib,
      minutes: 92,
      isTomorrow: false,
    },
    explicitDate: false,
    ...overrides,
  };
}
