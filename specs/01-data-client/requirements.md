# 01 — Data Client: Requirements

## 1. Purpose

Provide the typed, cached, validated data layer behind the CLI: cities,
calendar days, prayer days, date resolution, and the schedule calculations that
depend on them. This milestone contains no terminal output and no prompts.

## 2. Scope

**In scope**

- HTTP transport with a timeout and bounded retry.
- On-disk cache with TTL, stale fallback, offline mode, and atomic writes.
- Zod validation of every external payload.
- City, calendar-index, calendar-year, and prayer-year loading.
- Hijri year selection and calendar-day lookup.
- Pakistan civil-date helpers and after-Maghrib rollover.
- Sehri/Iftar calculation and next-event selection.
- Typed errors with stable codes and preserved causes.

**Out of scope**

- Rendering, colour, prompts, commander, and exit codes (milestone 02).
- Writing configuration.
- Computing dates or prayer times.
- Month views and status lines.

Requirement IDs use `DATA-<AREA>-<n>` and are referenced from `tasks.md`.

## 3. Definitions

- **Civil date** — `YYYY-MM-DD` in `Asia/Karachi`.
- **Display date** — the civil date after applying the convention; may be the
  next civil day after Maghrib.
- **Hijri day entry** — one value in `calendar.days[date]`.
- **Prayer day** — one value in `prayer.days[date]`, with six ISO instants.
- **Fresh cache** — an envelope younger than the route's TTL.
- **Stale cache** — an envelope older than TTL, usable only when the network
  fails.

## 4. Functional requirements

### 4.1 Cities

- **DATA-CITY-1** — WHEN the city list is requested, THE SYSTEM SHALL fetch
  `/cities.json`, validate it, and return every city with `id`, `name`,
  `province`, coordinates, and timezone.
- **DATA-CITY-2** — WHEN a city id is supplied for validation, THE SYSTEM SHALL
  accept it only when it appears in the validated city list.

### 4.2 Transport and cache

- **DATA-HTTP-1** — EVERY outbound request SHALL have a 10-second timeout and
  SHALL retry once on a network error or a 5xx response.
- **DATA-HTTP-2** — NON-2xx responses SHALL produce a typed error naming the
  route and status; the response body SHALL NOT be presented as data.
- **DATA-HTTP-3** — Responses SHALL be cached on disk in a single JSON envelope
  carrying `url`, `fetchedAt`, and the parsed body.
- **DATA-HTTP-4** — Cache filenames SHALL be derived by hashing the full URL so
  a crafted URL cannot escape the cache directory.
- **DATA-HTTP-5** — Cache writes SHALL be atomic: write a temporary file in the
  cache directory and rename it into place.
- **DATA-HTTP-6** — WHEN a fresh cache entry exists, THE SYSTEM SHALL serve it
  without a network request.
- **DATA-HTTP-7** — WHEN the network fails and a stale cache entry exists, THE
  SYSTEM SHALL serve the stale entry and report a warning through the injected
  warning sink.
- **DATA-HTTP-8** — WHEN `offline` is set, THE SYSTEM SHALL read only from cache
  and SHALL NOT attempt a network request.
- **DATA-HTTP-9** — WHEN `noCache` is set, THE SYSTEM SHALL bypass cache reads
  and writes for that invocation.
- **DATA-HTTP-10** — WHEN a payload is invalid JSON or fails its schema, THE
  SYSTEM SHALL produce a typed data error naming the route and SHALL NOT return
  partial data.

### 4.3 Calendar

- **DATA-CAL-1** — THE SYSTEM SHALL fetch and validate `/hijri/index.json`,
  exposing `coverage_start`, `hijri_years`, `baseline`, and `generated_at`.
- **DATA-CAL-2** — WHEN a display date is looked up, THE SYSTEM SHALL select a
  Hijri year using an `islamic-umalqura` estimate and SHALL fall back to
  adjacent and listed years until the date is found.
- **DATA-CAL-3** — WHEN the requested date is before `coverage_start`, THE
  SYSTEM SHALL throw an out-of-range error that includes the coverage start.
- **DATA-CAL-4** — WHEN no published calendar year contains the date, THE SYSTEM
  SHALL throw a data-unavailable error stating that the date is not covered yet.
- **DATA-CAL-5** — Calendar lookups SHALL preserve the published Hijri date,
  month names, confidence, and optional sources exactly as received.

### 4.4 Prayer

- **DATA-PRAY-1** — WHEN a prayer day is requested, THE SYSTEM SHALL fetch
  `/prayer/<city>/<profile>/<gregorianYear>.json` for the civil date's Gregorian
  year and validate it.
- **DATA-PRAY-2** — The prayer lookup SHALL expose the six times, the city and
  province metadata, the profile label, and the Sehri/Iftar offsets.
- **DATA-PRAY-3** — WHEN the requested prayer year is not published, THE SYSTEM
  SHALL throw a data-unavailable error naming the city, profile, and year.
- **DATA-PRAY-4** — Profile ids and display labels SHALL be defined once and
  match the API contract: `sunni_hanafi`, `sunni_asr1`, `shia_jafari`.
- **DATA-PRAY-5** — WHEN an unknown profile is supplied, THE SYSTEM SHALL throw a
  validation error listing the accepted ids.

### 4.5 Date and schedule

- **DATA-SCHED-1** — THE SYSTEM SHALL derive the civil date from an injected
  clock in `Asia/Karachi`, independent of the machine timezone.
- **DATA-SCHED-2** — WHEN the convention is `after-maghrib` and the current
  instant is at or after the civil day's Maghrib, THE SYSTEM SHALL advance the
  display date by one civil day and set `afterMaghrib` true.
- **DATA-SCHED-3** — WHEN the convention is `midnight`, THE SYSTEM SHALL keep the
  civil date and set `afterMaghrib` false.
- **DATA-SCHED-4** — WHEN an explicit date is supplied, THE SYSTEM SHALL treat it
  as the display date without applying a clock-based rollover.
- **DATA-SCHED-5** — WHEN the display date is in Ramadan (`month === 9`), THE
  SYSTEM SHALL calculate `sehriEnds` as Fajr plus `sehri_offset_min` and `iftar`
  as Maghrib plus `iftar_offset_min`; otherwise it SHALL return `null`.
- **DATA-SCHED-6** — THE SYSTEM SHALL select the next event strictly after the
  current instant from Fajr, Sunrise, Dhuhr, Asr, Maghrib, and Isha.
- **DATA-SCHED-7** — WHEN every event for the display day has passed, THE SYSTEM
  SHALL use the next civil day's Fajr, loading the next Gregorian year when the
  date crosses 31 December.
- **DATA-SCHED-8** — Schedule functions SHALL return instants and internal event
  ids only; display labels and clock formatting belong to the renderer.
- **DATA-SCHED-9** — The next-event result SHALL include the event id, the ISO
  instant, and the whole-minute countdown, floored at zero.

## 5. Non-functional requirements

- **DATA-NFR-1** — Unit tests SHALL be deterministic and offline; `fetch`,
  clocks, and directories SHALL be injected or faked.
- **DATA-NFR-2** — Errors SHALL carry a stable code, a human message, and the
  original cause where one exists.
- **DATA-NFR-3** — The data layer SHALL NOT import the CLI framework, prompts,
  colours, renderers, or `process.stdout`.
- **DATA-NFR-4** — Cache and config directories SHALL be created with
  user-only permissions, and files SHALL be written with user-only permissions.
- **DATA-NFR-5** — A live smoke against the deployed API SHALL be a manual
  verification step, never a unit test.

## 6. Traceability

Each requirement above is covered by a task in `tasks.md`. The interfaces,
algorithms, and open decisions are in `design.md`.
