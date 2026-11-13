# 01 — Data Client: Tasks

Requirements: [`requirements.md`](./requirements.md). Design:
[`design.md`](./design.md).

Every task cites the requirement IDs it satisfies. A task is complete only when
its tests pass offline and `npm run lint` is clean.

## 1. Transport and cache

- [ ] **T1.1** Define `CliError`, `HttpError`, `DataError`, `OutOfRangeError`,
      and `DataUnavailableError` with stable codes and preserved causes.
      — `DATA-NFR-2`
- [ ] **T1.2** Implement `fetchJson` with a 10-second abortable timeout, one
      retry on network/5xx, immediate failure on 4xx, and JSON parse errors.
      — `DATA-HTTP-1`, `DATA-HTTP-2`, `DATA-HTTP-10`
- [ ] **T1.3** Implement the SHA-256 cache key and assert that keys never contain
      path separators. — `DATA-HTTP-4`
- [ ] **T1.4** Implement `FileCache` envelope read/write, TTL checks, stale
      reads, atomic writes, `0o700`/`0o600` modes, and corrupt-envelope
      tolerance. — `DATA-HTTP-3`, `DATA-HTTP-5`, `DATA-HTTP-6`, `DATA-NFR-4`
- [ ] **T1.5** Wire `offline`, `noCache`, and stale-warning behaviour into the
      read path. — `DATA-HTTP-7`, `DATA-HTTP-8`, `DATA-HTTP-9`
- [ ] **T1.6** Table-test TTL boundaries, stale fallback, corrupt cache,
      unwritable cache, and offline with no cache. — `DATA-HTTP-6`–`DATA-HTTP-9`

## 2. Schemas and client

- [ ] **T2.1** Write zod schemas and camelCase mappers for cities, calendar
      index, calendar year, and prayer year. — `DATA-CITY-1`, `DATA-CAL-1`,
      `DATA-PRAY-1`, `DATA-PRAY-2`, `DATA-HTTP-10`
- [ ] **T2.2** Implement `HijriApi.cities()` and city-id validation against the
      fetched list. — `DATA-CITY-1`, `DATA-CITY-2`
- [ ] **T2.3** Implement `calendarIndex()` and `calendarYear()` with the route
      TTLs. — `DATA-CAL-1`
- [ ] **T2.4** Implement `prayerYear()` and `prayerDay()`, mapping offsets and
      metadata. — `DATA-PRAY-1`, `DATA-PRAY-2`, `DATA-PRAY-3`
- [ ] **T2.5** Define the profile ids/labels once and reject unknown profiles
      with the accepted list. — `DATA-PRAY-4`, `DATA-PRAY-5`
- [ ] **T2.6** Test fixture payloads for each route, including a missing prayer
      year and a schema mismatch. — `DATA-HTTP-10`, `DATA-PRAY-3`

## 3. Calendar lookup

- [ ] **T3.1** Implement the Hijri-year estimate with `Intl` and the fallback
      order (estimate, neighbours, listed years). — `DATA-CAL-2`
- [ ] **T3.2** Implement `calendarDay(date)`, rejecting dates before
      `coverage_start`. — `DATA-CAL-3`
- [ ] **T3.3** Return a typed unavailable error when no published year contains
      the date. — `DATA-CAL-4`
- [ ] **T3.4** Preserve Hijri date, both month names, confidence, and sources
      from the API entry. — `DATA-CAL-5`
- [ ] **T3.5** Table-test year boundaries, a 1448 lookup for `2026-11-13`, a
      pre-coverage date, and an unpublished future date. — `DATA-CAL-2`–
      `DATA-CAL-5`

## 4. Date and rollover

- [ ] **T4.1** Implement `todayInPakistan`, `addDays`, `isValidIsoDate`, and
      `gregorianYear` with injected instants and no machine-zone reads.
      — `DATA-SCHED-1`
- [ ] **T4.2** Implement `resolveDisplayDate` for after-Maghrib, midnight, and
      explicit dates. — `DATA-SCHED-2`, `DATA-SCHED-3`, `DATA-SCHED-4`
- [ ] **T4.3** Table-test just-before-Maghrib, exactly-at-Maghrib, after Isha,
      a missing Maghrib, a leap day, and a 31 December crossing.
      — `DATA-SCHED-1`–`DATA-SCHED-4`

## 5. Schedule

- [ ] **T5.1** Implement canonical event ordering and `nextEvent` with
      whole-minute countdown. — `DATA-SCHED-6`, `DATA-SCHED-9`
- [ ] **T5.2** Return `null` when the day is over; test the command's next-day
      fallback separately. — `DATA-SCHED-7`
- [ ] **T5.3** Implement `sehriIftar` for Ramadan only, applying both published
      offsets. — `DATA-SCHED-5`
- [ ] **T5.4** Assert that schedule functions return ids and instants, not
      labels or formatted clock strings. — `DATA-SCHED-8`
- [ ] **T5.5** Table-test each event boundary, the after-Isha case, the Sehri
      offset, the Iftar offset, and a non-Ramadan day. — `DATA-SCHED-5`–
      `DATA-SCHED-9`

## 6. Verification

- [ ] **T6.1** All unit tests pass with no network access.
      — `DATA-NFR-1`
- [ ] **T6.2** `npm run lint` and `npm run build` pass. — `DATA-NFR-1`
- [ ] **T6.3** Manual live smoke: cities, index, calendar `1448`, prayer
      `karachi/sunni_hanafi` for the current year. Record the commands and
      observed values in the run report. — `DATA-NFR-5`
- [ ] **T6.4** Confirm `src/api` and `src/domain` import nothing from `render`,
      `commander`, prompts, colours, or `process.stdout`. — `DATA-NFR-3`
