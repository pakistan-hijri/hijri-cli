# Milestone 04 — Presentation and Decoration Requirements

**Status:** Complete; docs authoritative.
**Depends on:** `02-cli-experience`, `03-calendar`.
**Linked decisions:** architecture `OD-00-4`, calendar `OD-03-4`, milestone
`OD-04-1`–`OD-04-5`.

## 1. Purpose

Give the two human card renderers a consistent visual identity without changing
what the CLI says, computes, or emits as data. Decoration is presentation only.

## 2. Scope

In scope:

- shared decoration primitives for frames, sections, badges, markers, and
  dotted leaders;
- decorated today and calendar cards;
- a calendar NOW strip that makes `--24h` and `--profile` visible;
- Unicode output with automatic ASCII fallback;
- goldens and flag-boundary tests for the above.

Out of scope:

- new Hijri or prayer calculations;
- changing `--plain` output or the `--json` schema;
- animation, box-drawing libraries, or a dedicated status-line command;
- shell completions (later milestone).

## 3. Requirements

### 3.1 Shared decoration

- **PRE-DEC-1** — Decoration SHALL live in `src/render/decor.ts` and be the only
  source of card width, corner glyphs, section rules, badges, markers, crescents,
  and leaders.
- **PRE-DEC-2** — The card width SHALL be 40 display columns. A subtitle too
  wide for the frame SHALL be truncated with an ellipsis rather than wrapping.
- **PRE-DEC-3** — `visibleWidth` SHALL ignore ANSI SGR sequences when measuring
  text, so coloured labels do not break alignment.
- **PRE-DEC-4** — WHEN Unicode is unsupported, THE SYSTEM SHALL substitute ASCII
  `+--` corners, `--` rules, `>` marker, `(` crescent, `[LABEL]` badge, and
  `...` leaders without losing information.
- **PRE-DEC-5** — Decoration SHALL NOT introduce a runtime dependency; it uses
  the existing pure theme and RTL helpers.
- **PRE-DEC-6** — Urdu output SHALL auto-detect bidi-capable terminals and use
  logical RLI/PDI there, while VS Code/xterm and unknown terminals use reversed
  LRO/PDF. `HIJRI_CLI_RTL=logical|visual` SHALL override detection.

### 3.2 Today card

- **PRE-CARD-1** — The card SHALL open with a framed `H I J R I` title and the
  resolved city and Gregorian date as its subtitle.
- **PRE-CARD-2** — `NEXT`, `PRAYERS`, and `STATUS` SHALL be separate labelled
  sections; the next event uses the `▸` marker and prayer rows use dotted leaders.
- **PRE-CARD-3** — The status line SHALL show the confidence badge and active
  profile, followed by `Calculated times; verify locally.` when prayer data is
  calculated.
- **PRE-CARD-4** — `--plain` SHALL produce the pre-milestone plain text, with no
  frame, sections, badge, marker, or leaders.

### 3.3 Calendar card

- **PRE-CAL-1** — The card SHALL open with a framed `CALENDAR` title and a
  `NOW` section before the month grid.
- **PRE-CAL-2** — The NOW strip SHALL show the next event label, time in the
  active 12- or 24-hour format, and countdown; a null next event SHALL print
  `Next: unavailable.`.
- **PRE-CAL-3** — `--profile` SHALL appear in the `LEGEND` section and `--24h`
  SHALL change only the NOW strip. Calendar dates and JSON SHALL NOT change.
- **PRE-CAL-4** — Ramadan months SHALL keep the Sehri/Iftar note and use the
  `☾` accent before it.

### 3.4 Scriptability and quality

- **PRE-PIPE-1** — `--json` SHALL remain byte-stable for a fixed view model and
  SHALL NOT contain decoration or NOW data.
- **PRE-PIPE-2** — Diagnostics and errors SHALL remain on stderr; only rendered
  results go to stdout.
- **PRE-NFR-1** — Every decoration helper SHALL have table-driven unit tests,
  including ASCII variants and ANSI-width cases.
- **PRE-NFR-2** — Rendered text and JSON SHALL be frozen in `testdata/` goldens,
  regenerated only by `npm run test:update`.
- **PRE-NFR-3** — `npm run lint` and `npm test` SHALL pass after each logical
  change, and a live smoke SHALL be recorded in ignored `docs/dev-runs/`.

## 4. Acceptance checklist

- [ ] Today and calendar cards share the same 40-column visual language.
- [ ] Unicode and ASCII paths are both covered by goldens.
- [ ] `--plain` and `--json` are unchanged for existing fixtures.
- [ ] Calendar `--24h` and `--profile` are visibly effective.
- [ ] Lint, tests, build, and manual smoke pass.
