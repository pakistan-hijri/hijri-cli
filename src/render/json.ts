/** Stable JSON success and error payloads for scripts. */

import type { ErrorCode } from "../errors.js";
import type { TodayView } from "../domain/view.js";
import { PRAYER_IDS } from "../domain/types.js";
import { formatClock } from "./time.js";

export function renderJsonSuccess(view: TodayView): string {
  const prayers: Record<string, string> = {};
  for (const id of PRAYER_IDS) {
    const prayer = view.prayers.find((entry) => entry.id === id);
    prayers[id] = formatClock(prayer?.at ?? "");
  }

  const payload = {
    ok: true,
    data: {
      city: view.city.id,
      profile: view.profile,
      gregorian: view.gregorian,
      hijri: {
        date: view.hijri.date,
        day: view.hijri.day,
        month: view.hijri.month,
        year: view.hijri.year,
        monthName: view.hijri.monthName,
      },
      confidence: view.confidence,
      afterMaghrib: view.afterMaghrib,
      prayers,
      sehriIftar:
        view.sehriIftar === null
          ? null
          : {
              sehriEnds: formatClock(view.sehriIftar.sehriEnds),
              iftar: formatClock(view.sehriIftar.iftar),
            },
      next:
        view.next === null
          ? null
          : {
              name: view.next.id,
              at: formatClock(view.next.at),
              minutes: view.next.minutes,
            },
    },
  };
  return `${JSON.stringify(payload, null, 2)}\n`;
}

export function renderJsonError(code: ErrorCode, message: string): string {
  return `${JSON.stringify(
    {
      ok: false,
      error: { code, message },
    },
    null,
    2,
  )}\n`;
}
