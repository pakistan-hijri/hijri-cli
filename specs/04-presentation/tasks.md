# Milestone 04 — Presentation and Decoration Tasks

Each task cites the requirement IDs it satisfies. Keep lint and tests green
between tasks; docs need not be committed with code if the dependency order is
preserved.

## 1. Shared decoration module

- [ ] **T1.1** Create `src/render/decor.ts` with `CARD_WIDTH`, `DecorStyle`,
      `spaced`, `frame`, `section`, `badge`, `marker`, `crescent`, `leaders`, and
      `visibleWidth`; use `displayWidth` from `rtl.ts`.
      — `PRE-DEC-1`, `PRE-DEC-2`, `PRE-DEC-5`
- [ ] **T1.2** Strip ANSI SGR sequences when measuring width; build the escape
      regex from a character code rather than a control-character literal.
      — `PRE-DEC-3`
- [ ] **T1.3** Add Unicode and ASCII variants for every helper, including
      subtitle truncation and minimum leader length in `test/render/decor.test.ts`.
      — `PRE-DEC-2`, `PRE-DEC-4`, `PRE-NFR-1`

## 2. Today card

- [ ] **T2.1** Replace local frame/rule code in `src/render/today.ts` with the
      shared frame and section helpers; keep city/date, Urdu, next, prayer, and
      status content in the same order. — `PRE-CARD-1`, `PRE-CARD-2`,
      `PRE-DEC-1`
- [ ] **T2.2** Use `marker` for the next event, `leaders` for prayer rows, and
      `badge` for confidence plus profile. — `PRE-CARD-2`, `PRE-CARD-3`
- [ ] **T2.3** Update today card goldens for Unicode, ASCII, Ramadan, after
      Maghrib, and date lookup; assert the plain golden is unchanged.
      — `PRE-CARD-4`, `PRE-NFR-2`

## 3. Calendar card and NOW strip

- [ ] **T3.1** Add `StatusView` to `src/domain/view.ts` and build it in
      `runCalendar` from current prayer data, with one optional tomorrow fetch.
      — `PRE-CAL-1`, `PRE-CAL-2`
- [ ] **T3.2** Pass `format` and `status` through `CalendarRenderOptions` and
      render the NOW strip only in the card. — `PRE-CAL-2`, `PRE-CAL-3`,
      `PRE-PIPE-1`
- [ ] **T3.3** Show the active profile in the legend and the Ramadan accent with
      `crescent`; update calendar goldens for 12h, 24h, ASCII, and Ramadan.
      — `PRE-CAL-3`, `PRE-CAL-4`, `PRE-NFR-2`
- [ ] **T3.4** Map an empty published month from `buildMonthView` to
      `OutOfRangeError` so exit `4` and `code: "out_of_range"` remain stable.
      — `PRE-PIPE-2`

## 4. Flag boundary and command semantics

- [ ] **T4.1** Extract `src/cli-program.ts` and test flag placement, precedence,
      help, version, colour, Unicode fallback, and unknown flags without I/O.
      — `PRE-DEC-4`, `PRE-PIPE-2`, `PRE-NFR-1`
- [ ] **T4.2** Add command-boundary tests for one-off flags, `--json` over
      `--plain`, rollover, unpublished months, and status inputs.
      — `PRE-CAL-2`, `PRE-CAL-3`, `PRE-PIPE-1`, `PRE-PIPE-2`

## 5. Documentation and verification

- [ ] **T5.1** Add this milestone to `README.md` roadmap and show decorated
      today/calendar examples plus clean dev invocations. — `PRE-CARD-1`,
      `PRE-CAL-1`
- [ ] **T5.2** Update `specs/architecture.md`, `specs/02-cli-experience/*`, and
      `specs/03-calendar/*` for the CLI factory, flag tests, decorations, NOW
      strip, and revised `OD-03-4`. — `PRE-DEC-1`, `PRE-CAL-3`
- [ ] **T5.3** Run `npm run lint`, `npm test`, and `npm run build`; record a live
      smoke in ignored `docs/dev-runs/`. — `PRE-NFR-3`
