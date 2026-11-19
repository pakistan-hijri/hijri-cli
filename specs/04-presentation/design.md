# Milestone 04 — Presentation and Decoration Design

**Read [`requirements.md`](./requirements.md) alongside this document.**
**Depends on:** `02-cli-experience`, `03-calendar`.

## 1. Rationale

The CLI already had stable information architecture but visually flat cards.
Repeating box-drawing code inside each renderer would drift, so a small pure
module owns the geometry. It is a renderer concern only: commands still pass a
resolved view model, and domain code never sees a glyph.

## 2. Interface

```ts
export const CARD_WIDTH = 40;

export interface DecorStyle {
  ascii: boolean;
  theme: Theme;
}

export function spaced(text: string): string;
export function frame(title: string, subtitle: string, style: DecorStyle): string[];
export function section(label: string, style: DecorStyle): string;
export function badge(text: string, style: DecorStyle): string;
export function marker(style: DecorStyle): string;
export function crescent(style: DecorStyle): string;
export function leaders(label: string, value: string, style: DecorStyle): string;
export function visibleWidth(text: string): number;
```

`frame` returns three lines so each renderer can insert its own content. Every
helper takes `DecorStyle` instead of reading flags or environment variables,
keeping the module pure and easy to test.

## 3. Unicode detection and colour

`supportsUnicode(env)` in `src/render/theme.ts` decides the glyph set: `TERM=dumb`
forces ASCII; a UTF-8 locale enables Unicode; `C`/`POSIX` disables it. No new
flag was added. Colour is independent: `createTheme(color)` supplies no-op
functions when colour is disabled or `NO_COLOR` is set.

`visibleWidth` strips ANSI SGR sequences with a regex built from
`String.fromCharCode(27)`; this avoids a lint-hostile control-character literal
while still measuring the visible string. Wide characters are delegated to the
existing `displayWidth` helper from `src/render/rtl.ts`.

## 4. Today card composition

```
╭─ H I J R I ──────────────────────────╮
│ Karachi · Friday, 13 November 2026   │
╰──────────────────────────────────────╯
2 Jumada al-Thani 1448 AH
             ⁨جمادی الثانی⁩
── NEXT ────────────────────────────────
▸ Next: Maghrib in 1h 32m
── PRAYERS ─────────────────────────────
  Fajr ······················ 5:28 AM
── STATUS ──────────────────────────────
[CONFIRMED]  sunni_hanafi
Calculated times; verify locally.
```

The Urdu line keeps its own line and width rules. `detectRtlMode(env)` chooses
logical RLI/PDI for bidi-aware terminals and visual LRO/PDF for VS Code/xterm;
`HIJRI_CLI_RTL=logical|visual` overrides the choice. The confidence badge is
bold but also reads plainly as `[CONFIRMED]`, so meaning does not depend on
colour.

## 5. Calendar card composition

The calendar uses the same frame, then inserts a NOW strip between the Gregorian
range and the month section. `StatusView` is assembled in `runCalendar`:

```ts
interface StatusView {
  at: string;
  label: string;
  minutes: number;
  isTomorrow: boolean;
  format: TimeFormat;
  profile: ProfileId;
  next: NextView | null;
}
```

`nextEvent(now, civilPrayer.day)` is tried first. If it returns `null`, tomorrow's
prayer and Hijri data are fetched once and the next event is recomputed from
that day. The renderer remains a pure function of `MonthView` plus
`CalendarRenderOptions`.

```ts
interface CalendarRenderOptions {
  color: boolean;
  ascii: boolean;
  format: TimeFormat;
  status: StatusView | null;
}
```

`renderCalendarPlain`, `renderCalendarJson`, and all CLI errors are untouched.

## 6. Failure modes

| Failure | Behaviour |
|---|---|
| Long city or month name | Subtitle truncated with `…`; no frame break |
| Coloured label measured for width | ANSI stripped before counting |
| `TERM=dumb` or `C` locale | ASCII glyphs; Urdu line omitted |
| `NO_COLOR` or `--no-color` | No ANSI, identical text content |
| No next event in loaded data | `Next: unavailable.` in the NOW strip |
| Empty published Hijri month | `DataUnavailableError` mapped to `out_of_range`, exit `4` |

## 7. Testing strategy

- `test/render/decor.test.ts`: helper outputs for both glyph sets, ANSI width,
  truncation, and minimum leader length.
- `test/render/rtl.test.ts`: terminal detection table, both RTL modes, override
  precedence, and bidi-control width handling.
- `test/render/render.test.ts` and `test/render/calendar.test.ts`: today/calendar
  goldens for Unicode, ASCII, Ramadan, Maghrib rollover, date lookup, and
  24-hour NOW strip.
- `test/cli/flags.test.ts`: flag placement, precedence, `--no-color`, TTY colour,
  `TERM=dumb`, help, version, and unknown flags through the Commander factory.
- `test/commands/*.test.ts`: flag semantics at the command boundary, including
  unpublished-month mapping and status inputs.
- `npm run test:update` is the only supported golden regeneration path.

## 8. Open decisions

- **OD-04-1 — Shared glyph set.** *Resolved:* one helper module instead of
  per-renderer constants; PDF/RTL handling stays in `rtl.ts`.
- **OD-04-2 — Fixed width.** *Resolved:* 40 columns for both cards, matching the
  existing calendar grid and keeping `jq`-friendly terminal output predictable.
- **OD-04-3 — Fallback.** *Resolved:* automatic locale/`TERM` detection, not an
  extra flag; users already have `--plain` and `--no-color`. Urdu RTL mode uses
  terminal-family detection plus `HIJRI_CLI_RTL` because no single byte stream
  shapes correctly in both Konsole and VS Code.
- **OD-04-4 — Calendar visibility for flags.** *Resolved:* a NOW strip is enough
  to make `--24h` and `--profile` visible without adding a separate status-line
  mode. This revises `OD-03-4`.
- **OD-04-5 — Decoration library.** *Resolved:* no new dependency; small local
  primitives keep offline builds and strict TypeScript simple.
