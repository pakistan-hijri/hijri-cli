# 02 — CLI Experience: Design

Requirements: [`requirements.md`](./requirements.md). Tasks:
[`tasks.md`](./tasks.md).

Dependencies: milestones 00 and 01.

## 1. Goals and boundaries

This milestone turns data into an experience. The rule from
`specs/architecture.md` holds: commands compose, domain decides, renderers
format. A command handler may read flags and config, call the API and domain,
and choose an exit code. It must not format a time, choose a colour, or compute
a prayer offset.

```
cli.ts
  └─ command handler
       ├─ config (load/merge/save)
       ├─ onboard (TTY only)
       ├─ api (cities/calendar/prayer)
       ├─ domain (rollover/schedule/view)
       └─ render (card/plain/json)
```

## 2. CLI shape

```
hijri [options]                 today view
hijri setup                     interactive city/profile setup
hijri config [--show|--clear]   show or clear saved configuration
hijri config --city <id> --profile <id> --convention <mode> --time-format <fmt>
hijri --help
hijri --version
```

Today options:

| Option | Value | Effect |
|---|---|---|
| `--city <id>` | city id | One-off city. |
| `--profile <id>` | profile id | One-off profile. |
| `--date <YYYY-MM-DD>` | civil date | Explicit lookup, no rollover. |
| `--midnight` | — | Use the civil date. |
| `--after-maghrib` | — | Roll over at Maghrib. |
| `--24h` | — | 24-hour human output. |
| `--json` | — | Machine output. |
| `--plain` | — | Undecorated human output. |
| `--no-color` | — | Disable colour. |
| `--offline` | — | Cache only. |
| `--no-cache` | — | Bypass read and write. |

`--midnight` and `--after-maghrib` together are a usage error. `--json` wins
over `--plain` and `--24h` for the JSON payload; `--24h` still applies to human
output only.

Commander runs with `exitOverride()` so every failure passes through one
handler. Help and version map to exit `0`; commander usage errors map to exit
`2`; anything else goes through `CliError`.

## 3. Configuration

```ts
interface AppConfig {
  version: 1;
  city: string;
  profile: ProfileId;
  convention: Convention;
  timeFormat: "12h" | "24h";
}
```

Resolution:

```ts
function resolveSettings(
  flags: TodayFlags,
  saved: AppConfig | undefined,
): AppConfig;
```

Order is flag, saved, default, exactly as `CLI-PREC-1`. Every field is resolved
independently, so `--city lahore` keeps the saved profile. The result is never
saved unless the command is `setup` or `config`.

`src/config/config.ts`:

- loads with `readFile`, parses JSON, validates with zod;
- a missing file is not an error and yields `undefined`;
- unreadable or invalid files throw `ConfigError` with the path;
- saves atomically with mode `0o600`, directory `0o700`;
- clears by unlinking the file and ignoring `ENOENT`.

`hijri config`:

- no flags, or `--show`: print the saved config; if none, print defaults and say
  they are defaults. No network.
- setters: load existing or defaults, apply flags, validate the city against
  `/cities.json`, save, print.
- `--clear` alone: delete and print `Configuration cleared.`; combined with any
  setter or `--show` is a usage error.

## 4. Onboarding

`setup` and first-run share one flow:

```ts
interface OnboardDeps {
  cities: City[];
  prompts: {
    selectCity(cities: City[]): Promise<string | null>;
    selectProfile(): Promise<ProfileId | null>;
  };
  writer: Writer;
}
```

`@clack/prompts` is wrapped in `src/onboard/prompts.ts`; tests inject the two
functions and never start a real prompt. A `null` result means the user
cancelled with Ctrl-C.

Flow:

1. Fetch `/cities.json` once.
2. Intro line.
3. City select, showing `name — province` and returning the id.
4. Profile select, default `sunni_hanafi`; labels come from the API contract
   (`Sunni (Hanafi)`, `Sunni (earlier Asr)`, `Shia (Jafari)`).
5. Validate the pair.
6. Save atomically.
7. For first-run, continue into the today view with the new settings.

Rendered via `@clack/prompts`:

```
┌  hijri-cli
│
◆  City
│  ● Karachi — Sindh
│  ○ Lahore — Punjab
│  ...
└
```

A non-TTY never reaches this flow. The today command sees no saved config, emits
`No saved configuration; using Karachi and sunni_hanafi. Run "hijri setup" to
choose.` on stderr, and continues. `setup` in a non-TTY exits `2` instead of
pretending to prompt.

## 5. Today command

`src/commands/today.ts` is the orchestration point:

```ts
async function runToday(input: {
  flags: TodayFlags;
  deps: TodayDeps;
}): Promise<void>;
```

Steps:

1. Load config. On first interactive run, onboard and save. On non-TTY, apply
   defaults with the warning.
2. Resolve settings.
3. `now = deps.now()`.
4. `civilDate = todayInPakistan(now)`.
5. If `flags.date` is set, validate it and use it as `displayDate`; otherwise:
   - load the civil day's prayer day,
   - call `resolveDisplayDate` with its Maghrib,
   - if the display date advanced, load the display day's prayer day.
6. Load the display calendar day and prayer day. The API client memoises year
   files for the lifetime of the process, so the rollover lookup does not
   re-download a year.
7. If not an explicit different date, select the next event. If the display day
   is over, load the next day's prayer and calendar, use its Fajr, and mark
   `isTomorrow`. If an explicit date is not today, `next` is `null` and the card
   says the view is a date lookup.
8. Build the `TodayView` in `src/domain/view.ts`.
9. Choose one renderer: JSON, plain, or card.
10. Write to the injected writer.

The command never prints a warning itself; it passes a warning sink that writes
to stderr.

## 6. View model

```ts
interface TodayView {
  city: { id: string; name: string };
  profile: ProfileId;
  gregorian: string;
  weekday: string;
  hijri: {
    date: string;
    day: number;
    month: number;
    year: number;
    monthName: { en: string; ur: string };
  };
  confidence: Confidence;
  afterMaghrib: boolean;
  ramadan: boolean;
  prayers: { id: PrayerId; label: string; at: string }[];
  sehriIftar: { sehriEnds: string; iftar: string } | null;
  next: {
    id: PrayerId;
    label: string;
    at: string;
    minutes: number;
    isTomorrow: boolean;
  } | null;
  explicitDate: boolean;
}
```

Labels are chosen once in `domain/view.ts`:

- Ramadan: `fajr` → `Sehri ends`, `maghrib` → `Iftar`. Those two rows carry the
  offset-adjusted Sehri and Iftar instants, taken from the same source as the
  highlighted Sehri/Iftar line, so the label and the time always agree.
- Otherwise: `Fajr`, `Sunrise`, `Dhuhr`, `Asr`, `Maghrib`, `Isha`.
- `next.isTomorrow` appends ` (tomorrow)` to the label.

`render` receives instants and formats them; it does not recompute labels or
offsets.

## 7. Rendering

### 7.1 Time and countdown

`src/render/time.ts`:

```ts
function formatTime(iso: string, format: "12h" | "24h"): string;
function formatCountdown(minutes: number): string;
function formatWeekday(date: string): string;
```

- Formatting uses `Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Karachi" })`.
- `12h` produces `5:28 AM`; `24h` produces `05:28`.
- JSON always uses 24-hour `HH:mm`.
- Countdown is `2h 14m`, `14m`, or `now` at zero.
- Weekday is `Friday, 13 November 2026`.

### 7.2 Card

```
Hijri · Karachi
────────────────────────────────────────
Friday, 13 November 2026
2 Jumada al-Thani 1448 AH
                            ⁨جمادی الثانی⁩
Next: Maghrib in 2h 14m

Fajr       5:28 AM
Sunrise    6:47 AM
Dhuhr     12:16 PM
Asr        4:09 PM
Maghrib    5:45 PM
Isha       7:04 PM

Confidence: confirmed
Calculated times; verify locally.
```

Rules:

- Title is bold when colour is on.
- The rule is `─` repeated to 40 columns; ASCII fallback is `-`.
- `afterMaghrib` adds `Showing 14 November 2026 (after Maghrib)` below the
  Gregorian line.
- Non-confirmed confidence adds `Only confirmed dates are official.`
- Ramadan adds `Sehri ends 5:12 AM · Iftar 5:56 PM` above the prayer rows,
  highlights that line, and uses the Ramadan row labels.
- Next line is omitted for an explicit date; instead the card prints
  `Date lookup: no countdown.`
- `--no-color` and `NO_COLOR` produce the same text without ANSI codes.
- The Urdu name is a separate line, right-aligned to the 40-column width. Its
  graphemes are reversed into visual RTL order and wrapped in LRO/PDF
  (U+202D/U+202C), so bidi-aware terminals and the many terminals that ignore
  bidi controls both draw it right-to-left. Display width ignores bidi
  controls, joiners, and combining marks.
- The ASCII fallback omits the Urdu line and uses `-` rules.

### 7.3 Plain

`--plain` prints the same fields as `key: value` lines, no rules, no colour, no
bold. It is the format that survives `less`, logs, and a terminal without
Unicode.

### 7.4 JSON

`src/render/json.ts` builds the exact README shape. Key order is fixed by object
literal construction, indentation is two spaces, and the writer appends one
newline. Prayer and next times use 24-hour `HH:mm`, regardless of `--24h`.

Success goes to stdout. Errors go to stderr as:

```json
{
  "ok": false,
  "error": {
    "code": "network",
    "message": "Could not reach pakistan-hijri.github.io. Check your connection and try again."
  }
}
```

No stack trace is printed unless `HIJRI_CLI_DEBUG=1`.

## 8. Errors and exit codes

`src/errors.ts`:

| `code` | Exit | Used for |
|---|---|---|
| `usage` | 2 | Bad flag, bad date, conflicting convention, non-TTY setup |
| `config` | 2 | Unreadable or invalid config |
| `network` | 3 | Unreachable API, no usable cache, offline miss |
| `data_unavailable` | 3 | Missing prayer year, unpublished payload |
| `out_of_range` | 4 | Date before coverage or outside published calendar |
| `cancelled` | 1 | User cancelled onboarding |
| `unexpected` | 1 | Anything unclassified |

`cli.ts` is the only place that calls `process.exitCode`. It writes a human
error to stderr, or the JSON error object when `--json` was passed and parsing
got far enough to know that.

## 9. Testing strategy

- **Golden files** in `testdata/` for card, plain, JSON success, JSON error,
  Ramadan, after-Maghrib, and ASCII fallback. Update with
  `npm run test:update`.
- **Command tests** use a fake API, fixed clock, temporary config, and a
  capturing writer. They assert exit code and stderr/stdout separation.
- **Onboarding tests** inject prompt results, including cancellation.
- **Config tests** cover precedence, invalid JSON, atomic save, and clear.
- **Renderer tests** are pure and run without the API.
- **Manual smoke** uses the deployed API and a temporary config directory; the
  transcript goes in `docs/dev-runs/`.

## 10. Open decisions

- **OD-02-1 — Explicit-date countdown.** *Resolved:* no countdown for an
  explicit date that is not today. A past or future civil date has no meaningful
  "in 2h" value, and a fake one would mislead. JSON uses `"next": null`.
- **OD-02-2 — JSON vs plain.** *Resolved:* `--json` wins. It is the only
  machine format, and combining flags should not fail a pipeline.
- **OD-02-3 — Setup flags.** *Resolved:* `hijri setup` is interactive only;
  scriptable changes use `hijri config --city`/`--profile`. This keeps each
  command's failure mode obvious.
- **OD-02-4 — Config command output.** *Resolved:* always print the effective
  configuration after a change; print saved-or-default with source labels for
  `--show`.
- **OD-02-5 — No-TTY first run.** *Resolved:* defaults plus a stderr warning.
  Never hang a script.
- **OD-02-6 — Colour detection.** *Resolved:* TTY and no `NO_COLOR` and no
  `--no-color`; colour never carries meaning alone.
- **OD-02-7 — JSON time format.** *Resolved:* always 24-hour `HH:mm`. Human
  `--24h` does not change the machine contract.
- **OD-02-8 — Debug output.** *Resolved:* `HIJRI_CLI_DEBUG=1` adds a stack trace
  to stderr; it never changes stdout.
- **OD-02-9 — RTL strategy.** *Resolved:* emit graphemes in visual order inside
  an LRO/PDF pair. FSI/PDI isolates were tried first but only affect
  bidi-aware renderers; common terminal emulators ignore them and keep drawing
  the logical string left-to-right. Reversal plus an LTR override works in both
  cases. Letter joining still depends on the terminal's shaper.
