# 03 — Calendar: Requirements

## 1. Purpose

Add a Hijri month calendar alongside the today view. It reuses the published
calendar files, marks the resolved current day, and treats Ramadan and date
confidence as first-class information rather than computing dates locally.

## 2. Scope

**In scope**

- A `hijri calendar` command with a Monday-first Hijri month grid.
- `--month` and `--year` selection; one-off `--city` and `--profile`.
- Human card, plain text, and stable JSON output.
- Today marker, Ramadan emphasis, and confidence summary.
- The existing config, cache, error, and exit-code policies.

**Out of scope**

- New date or prayer calculations; all dates come from `hijri-api`.
- Prayer-time grids or per-day Sehri/Iftar times; a single current-event NOW
  strip is included.
- A dedicated status-line mode and shell completions (later milestones).

Requirement IDs use `CAL-<AREA>-<n>` and are referenced from `tasks.md`.

## 3. Functional requirements

### 3.1 Command and selection

- **CAL-CMD-1** — WHEN `hijri calendar` runs with no month or year, THE SYSTEM
  SHALL show the Hijri month containing the resolved current display date.
- **CAL-CMD-2** — WHEN `--month <1-12>` or `--year <hijri year>` is supplied,
  THE SYSTEM SHALL show that Hijri month and SHALL leave saved configuration
  untouched.
- **CAL-CMD-3** — A month or year that is not an integer, or a month outside
  `1..12`, SHALL be a usage error with exit `2`.
- **CAL-CMD-4** — WHEN `--city` or `--profile` is supplied, THE SYSTEM SHALL
  validate it with the same rules as the today view and SHALL NOT save it.
- **CAL-CMD-5** — The current display date for the month default and the today
  marker SHALL use the same Maghrib rollover rule as the today view.

### 3.2 Month grid

- **CAL-GRID-1** — The grid SHALL start on Monday and SHALL contain one cell per
  day of the selected Hijri month, with leading and trailing empty slots so each
  week has seven columns.
- **CAL-GRID-2** — Each populated cell SHALL show the Hijri day number and the
  corresponding Gregorian day-of-month; the header SHALL state the full
  Gregorian range so a day number is never ambiguous.
- **CAL-GRID-3** — The resolved current day SHALL carry a `*` marker with a
  legend when it falls inside the displayed month, and SHALL be absent
  otherwise.
- **CAL-GRID-4** — WHEN the month is Ramadan, THE SYSTEM SHALL say so and print
  that Sehri ends at Fajr and Iftar at Maghrib; other months SHALL NOT print
  that note.
- **CAL-GRID-5** — The card SHALL show the English and Urdu month names; the
  Urdu name SHALL be on its own right-aligned line in visual RTL order as in the
  today card. The ASCII fallback SHALL omit it.
- **CAL-GRID-6** — The card SHALL show a confidence summary. When all days share
  one confidence it SHALL print that value; otherwise it SHALL print `mixed`.
  Any non-`confirmed` day SHALL add `Only confirmed dates are official.`

### 3.3 Output

- **CAL-OUT-1** — `--plain` SHALL print the same information without rules,
  colour, or box drawing and SHALL remain readable when piped.
- **CAL-OUT-2** — `--json` SHALL print exactly one object with `ok: true` and
  `data` containing city, profile, year, month, both month names, `ramadan`, a
  confidence summary, the current day's Hijri date or `null`, and an ordered
  `days` array. Each day SHALL carry its Hijri date, day number, Gregorian date,
  and confidence.
- **CAL-OUT-3** — JSON SHALL use stable field order, two-space indentation, and
  a trailing newline. stdout SHALL carry only the result.
- **CAL-OUT-4** — The card SHALL include a NOW strip with the next event from
  the already-loaded current prayer data, its time in the active 12- or 24-hour
  format, and the active profile. `--24h` and `--profile` SHALL visibly change
  that strip; `--plain` and `--json` SHALL remain unchanged by it.
- **CAL-OUT-5** — The card SHALL use the shared 40-column decoration system:
  framed title, section rules, `▸` marker, and confidence badge, with ASCII
  substitutes when Unicode is unavailable.

### 3.4 Errors

- **CAL-ERR-1** — WHEN the requested Hijri year is not published, THE SYSTEM
  SHALL exit `4` and name the available years.
- **CAL-ERR-2** — WHEN the requested month has no published days, THE SYSTEM
  SHALL exit `4` with a "not published" message.
- **CAL-ERR-3** — WHEN no usable data exists because the network is down or
  `--offline` misses the cache, THE SYSTEM SHALL use the existing network and
  cache error policy.
- **CAL-ERR-4** — WHEN `--json` fails, THE SYSTEM SHALL print the standard JSON
  error object to stderr and nothing to stdout.

## 4. Non-functional requirements

- **CAL-NFR-1** — Month assembly SHALL be a pure domain function over a parsed
  `CalendarFile`, an injected current Hijri date, and selection inputs.
- **CAL-NFR-2** — Renderers SHALL be pure and SHALL NOT fetch, read files, or
  inspect argv.
- **CAL-NFR-3** — The command SHALL compose config, API, domain, and render
  without duplicating rollover, date, or formatting logic.
- **CAL-NFR-4** — Golden files SHALL freeze the card, plain, JSON, Ramadan, and
  ASCII calendar output; regeneration SHALL require `npm run test:update`.
- **CAL-NFR-5** — Tests SHALL stay offline and deterministic with a fake API,
  fixed clock, temporary config, and capturing writer.

## 5. Traceability

Each requirement is covered by a task in `tasks.md`. Layout, interfaces, and
open decisions are in `design.md`.
