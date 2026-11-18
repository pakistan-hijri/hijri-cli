# 03 — Calendar: Tasks

Requirements: [`requirements.md`](./requirements.md). Design:
[`design.md`](./design.md).

Every task cites the requirement IDs it satisfies. A task is complete only when
its tests pass, `npm run lint` is clean, and the relevant golden files are
reviewed.

## 1. Specification

- [ ] **T1.1** Write the calendar requirements, design, and task checklist.
      — `CAL-NFR-1`–`CAL-NFR-5`
- [ ] **T1.2** Update `specs/architecture.md` with the calendar modules, output,
      and revised non-goals. — `CAL-NFR-1`, `CAL-NFR-2`

## 2. Domain

- [ ] **T2.1** Define `MonthCell` and `MonthView` in `src/domain/month.ts`.
      — `CAL-GRID-1`, `CAL-GRID-2`
- [ ] **T2.2** Implement `buildMonthView` with Monday weeks, Gregorian range,
      today marker, confidence summary, and Ramadan flag. — `CAL-GRID-1`,
      `CAL-GRID-3`–`CAL-GRID-6`
- [ ] **T2.3** Reject an empty month with `DataUnavailableError`. — `CAL-ERR-2`
- [ ] **T2.4** Test 29/30-day months, week offsets, today inside and outside the
      month, mixed confidence, Ramadan, and empty months. — `CAL-GRID-1`–
      `CAL-GRID-6`, `CAL-NFR-5`

## 3. Renderers

- [ ] **T3.1** Implement `renderCalendarCard` with the grid, range, confidence,
      today legend, Ramadan note, and bidi-isolated Urdu line. — `CAL-GRID-1`–
      `CAL-GRID-6`
- [ ] **T3.2** Implement `renderCalendarPlain` with the same information and no
      decoration. — `CAL-OUT-1`
- [ ] **T3.3** Implement the stable JSON payload with ordered days.
      — `CAL-OUT-2`–`CAL-OUT-4`
- [ ] **T3.4** Add card, plain, JSON, Ramadan, and ASCII goldens and document
      regeneration through `npm run test:update`. — `CAL-NFR-4`

## 4. Command and wiring

- [ ] **T4.1** Implement `runCalendar` with shared settings resolution,
      rollover, year validation, and month assembly. — `CAL-CMD-1`,
      `CAL-CMD-3`–`CAL-CMD-5`, `CAL-ERR-1`
- [ ] **T4.2** Wire the `calendar` subcommand, merge root and command flags, and
      route all errors through the existing handler. — `CAL-CMD-2`–`CAL-CMD-4`,
      `CAL-ERR-3`, `CAL-ERR-4`
- [ ] **T4.3** Test defaults, explicit month/year, one-off flags not persisted,
      JSON, invalid input, unpublished year, and stdout/stderr separation.
      — `CAL-CMD-1`–`CAL-CMD-5`, `CAL-ERR-1`–`CAL-ERR-4`, `CAL-NFR-5`
- [ ] **T4.4** Confirm the command contains no duplicated date, rollover, or
      formatting logic. — `CAL-NFR-3`

## 5. Documentation and verification

- [ ] **T5.1** Document the calendar command, its flags, and its JSON in the
      README; mark the milestone complete in the roadmap. — `CAL-CMD-1`,
      `CAL-OUT-2`
- [ ] **T5.2** Run `npm run lint`, `npm test`, `npm run build`, and
      `node dist/cli.js calendar --help`.
- [ ] **T5.3** Manual live smoke against the deployed API, recorded in
      `docs/dev-runs/`.
