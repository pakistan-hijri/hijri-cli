# 03 — Calendar: Design

Requirements: [`requirements.md`](./requirements.md). Tasks:
[`tasks.md`](./tasks.md).

Dependencies: milestone 01 for the calendar client, milestone 02 for config,
onboarding, rendering conventions, and error mapping.

## 1. Goals and boundaries

The calendar is a second view over data the client already fetches. It must not
become a second source of truth: no Hijri arithmetic, no prayer calculation, and
no inference of a month length beyond the days published in the calendar file.
The existing layering holds:

```
cli.ts → commands/calendar.ts → api.calendarYear / api.calendarDay
                              → domain/month.ts → render/calendar.ts
```

`domain/month.ts` receives a parsed `CalendarFile` and the resolved current Hijri
date; it never calls the API. `render/calendar.ts` receives a `MonthView` and a
writer; it never calls the API or inspects flags.

## 2. Command shape

```
hijri calendar [--month <1-12>] [--year <hijri year>]
hijri calendar --city <id> --profile <id> --json
hijri calendar --plain --24h
```

`--month` and `--year` default to the Hijri month and year of the resolved
current display date. Root flags placed before the subcommand and command flags
placed after it are merged, with the command flag winning. Accepted values are
validated in the command layer: integer month in `1..12`, positive integer year.
`--profile` and `--24h` are accepted for flag compatibility and do not change
calendar data; the profile is echoed in JSON for scripts that want it.

## 3. Data flow

1. Resolve settings with the shared `loadRunSettings` helper (`config`,
   onboarding, defaults, one-off flags).
2. `civilDate = todayInPakistan(now)`.
3. Load the civil day's prayer day and apply `resolveDisplayDate` with the saved
   convention, exactly as `runToday` does.
4. `calendarDay(displayDate)` gives the resolved current Hijri date.
5. Choose the target year and month from flags or that Hijri date.
6. Reject a year absent from `calendarIndex().hijriYears` with `OutOfRangeError`.
7. Load `calendarYear(year)`, filter its `days` by `month`, sort by Gregorian
   date, and build the `MonthView`.

Steps 2–4 are the only reason the calendar needs prayer data. They keep the
today marker and the default month consistent with `hijri`; without them a
post-Maghrib run would highlight yesterday.

## 4. View model

```ts
interface MonthCell {
  gregorian: string;
  hijri: string;
  day: number;
  confidence: Confidence;
  today: boolean;
}

interface MonthView {
  city: { id: string; name: string };
  profile: string;
  year: number;
  month: number;
  monthName: { en: string; ur: string };
  ramadan: boolean;
  confidence: Confidence | "mixed";
  today: string | null;
  gregorianStart: string;
  gregorianEnd: string;
  weeks: (MonthCell | null)[][];
}
```

`buildMonthView` is the only place that decides week boundaries:

- Weekday is derived from the Gregorian date at `Asia/Karachi` noon via
  `Intl`/`Date`, never from a local timezone.
- Monday is column 0; leading empty slots are `(weekday + 6) % 7`.
- Trailing empty slots complete the final week.
- `confidence` is the single value when every cell agrees, otherwise `mixed`.
- `today` is the resolved Hijri date string, or `null` when it is outside the
  displayed month. The matching cell is marked; there is at most one.
- `ramadan` is `month === 9`, derived from the month number as in `view.ts`.
- An empty month throws `DataUnavailableError`, which the command maps to a
  `not published` out-of-range failure.

## 5. Rendering

### 5.1 Card

```
Hijri · Karachi
────────────────────────────────────────
Jumada al-Thani 1448 AH
                            ⁨جمادی الثانی⁩
13 Nov – 11 Dec 2026
Mon Tue Wed Thu Fri Sat Sun
  1   2   3   4   5   6   7
 13  14  15  16  17  18  19
 20  21  22  23  24  25  26
 27  28  29  30
Confidence: confirmed
```

- Columns are four characters wide: a three-character right-aligned number and
  one separator space. Each week prints the Hijri row, then a dimmed Gregorian
  row of day numbers; the range header supplies month and year.
- The current day's Hijri cell is `*13` and a `* today` legend follows the grid.
- Ramadan adds `Ramadan: Sehri ends at Fajr; Iftar at Maghrib.` before the rule
  or directly under the month line, and the title uses the accent colour.
- A non-confirmed day adds `Only confirmed dates are official.` after the
  confidence line.
- The Urdu line uses the same visual-order reversal, LRO/PDF wrapper, and width
  rules as the today card. ASCII uses `Hijri - Karachi`, `-` rules, `Mo Tu We Th Fr Sa Su`, and no
  Urdu line.
- Colour never carries meaning alone: `*` and words do the work.

### 5.2 Plain and JSON

`--plain` keeps the same lines without rules, colour, or bold. `--json` uses:

```json
{
  "ok": true,
  "data": {
    "city": "karachi",
    "profile": "sunni_hanafi",
    "year": 1448,
    "month": 6,
    "monthName": { "en": "Jumada al-Thani", "ur": "جمادی الثانی" },
    "ramadan": false,
    "confidence": "confirmed",
    "today": "1448-06-02",
    "days": [
      {
        "hijri": "1448-06-01",
        "day": 1,
        "gregorian": "2026-05-28",
        "confidence": "confirmed"
      }
    ]
  }
}
```

Key order is fixed by object construction. `today` is `null` when the resolved
day is in another month. No prayer times or countdown appear, so `--24h` cannot
change the payload.

## 6. Errors and exit codes

The shared error taxonomy is unchanged. In addition:

| Failure | Behaviour |
|---|---|
| Invalid `--month` / `--year` | `usage`, exit `2` |
| Year not in `hijri_years` | `out_of_range`, exit `4`, list available years |
| Month has no published days | `out_of_range`, exit `4`, "not published yet" |
| Missing prayer data for the rollover check | existing `data_unavailable` policy |

## 7. Testing strategy

- `test/domain/month.test.ts`: table-driven month assembly for 29- and 30-day
  months, Monday offsets, trailing slots, today marker, mixed confidence,
  Ramadan, and empty months.
- `test/render/calendar.test.ts`: goldens for card, plain, JSON, Ramadan, and
  ASCII; update only with `npm run test:update`.
- `test/commands/calendar-command.test.ts`: fake API, fixed clock, temporary
  config, capturing writer. Cover defaults, explicit month/year, one-off flags
  not saved, JSON, invalid input, unpublished year, and stdout/stderr split.
- **Manual smoke**: live `hijri calendar`, `hijri calendar --month 9 --year 1448`,
  `--json | jq`, and `--offline`; record in `docs/dev-runs/`.

## 8. Open decisions

- **OD-03-1 — Week start.** *Resolved:* Monday, matching the common Pakistani
  calendar layout and keeping the grid stable across locales.
- **OD-03-2 — Cell content.** *Resolved:* two stacked rows per week — Hijri day
  above Gregorian day-of-month — with the full Gregorian range in the header.
  Putting both dates in one cell would exceed 40 columns.
- **OD-03-3 — Today marker.** *Resolved:* `*` on the Hijri cell plus a legend.
  Colour alone would fail for pipes and monochrome terminals.
- **OD-03-4 — Profile and `--24h`.** *Resolved:* accepted and echoed where
  relevant, but calendar data is profile-independent and contains no times.
- **OD-03-5 — Rollover dependence.** *Resolved:* reuse the Maghrib rollover so
  the calendar and today view agree about "today", even though it costs one
  extra prayer lookup.
- **OD-03-6 — Later milestone split.** *Resolved:* this milestone ships only the
  month view; status line and shell completions remain a separate milestone.
