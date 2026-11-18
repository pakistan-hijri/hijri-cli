# 02 — CLI Experience: Requirements

## 1. Purpose

Turn the data client into a usable command: first-run onboarding, a readable
today view, Ramadan-aware labels and countdown, scriptable JSON, configuration
commands, and predictable failures.

## 2. Scope

**In scope**

- `hijri`, `hijri setup`, `hijri config`, `--help`, `--version`.
- City/profile onboarding and saved configuration.
- Flag precedence and deterministic date lookup.
- Human card, plain text, and stable JSON output.
- Ramadan Sehri/Iftar labels and next-event countdown.
- stderr diagnostics and documented exit codes.
- Colour policy and non-TTY behaviour.

**Out of scope**

- Ramadan month view, status line, and completions (milestone 03).
- Local calculation of dates or prayer times.
- Network writes or telemetry.

Requirement IDs use `CLI-<AREA>-<n>` and are referenced from `tasks.md`.

## 3. Functional requirements

### 3.1 Commands

- **CLI-CMD-1** — WHEN `hijri` runs with no subcommand, THE SYSTEM SHALL show
  the today view for the resolved city, profile, convention, and time format.
- **CLI-CMD-2** — WHEN `hijri setup` runs in a TTY, THE SYSTEM SHALL prompt for
  city and prayer profile, validate the answers, and save them.
- **CLI-CMD-3** — WHEN `hijri setup` runs without a TTY, THE SYSTEM SHALL exit
  `2` and explain that setup needs an interactive terminal.
- **CLI-CMD-4** — WHEN `hijri config` runs, THE SYSTEM SHALL print the effective
  saved configuration without contacting the API.
- **CLI-CMD-5** — WHEN `hijri config` receives `--city`, `--profile`,
  `--convention`, or `--time-format`, THE SYSTEM SHALL validate and persist the
  supplied values and print the resulting configuration.
- **CLI-CMD-6** — WHEN `hijri config --clear` runs alone, THE SYSTEM SHALL
  remove the saved configuration file and report that it is gone.
- **CLI-CMD-7** — WHEN `--help` or `--version` is requested, THE SYSTEM SHALL
  print the requested information to stdout and exit `0` without touching the
  network or config.

### 3.2 Onboarding and configuration

- **CLI-ONB-1** — WHEN the today view runs interactively with no saved config,
  THE SYSTEM SHALL prompt for city and prayer profile before loading data.
- **CLI-ONB-2** — The city prompt SHALL list the ids from `/cities.json` and map
  the selection to a saved city id.
- **CLI-ONB-3** — The profile prompt SHALL offer `sunni_hanafi` (default),
  `sunni_asr1`, and `shia_jafari` with human-readable labels.
- **CLI-ONB-4** — WHEN the user cancels onboarding, THE SYSTEM SHALL exit `1`
  without writing a partial config and without printing a result.
- **CLI-ONB-5** — WHEN the today view runs without a TTY and no saved config,
  THE SYSTEM SHALL use Karachi, `sunni_hanafi`, `after-maghrib`, and `12h`, and
  SHALL warn on stderr that setup was skipped.
- **CLI-ONB-6** — WHEN the config file is unreadable, invalid JSON, or fails its
  schema, THE SYSTEM SHALL exit `2`, name the file, and suggest
  `hijri config --clear`.
- **CLI-ONB-7** — A saved config SHALL be written atomically with user-only
  permissions and SHALL contain a schema version.

### 3.3 Precedence

- **CLI-PREC-1** — THE SYSTEM SHALL resolve each setting as **flag > saved
  config > default**.
- **CLI-PREC-2** — A one-off flag on the today view SHALL NOT modify the saved
  configuration.
- **CLI-PREC-3** — Defaults SHALL be Karachi, `sunni_hanafi`, `after-maghrib`,
  and `12h`, used when neither a flag nor a saved value exists.
- **CLI-PREC-4** — WHEN both `--midnight` and `--after-maghrib` are supplied,
  THE SYSTEM SHALL exit `2` with a usage error.

### 3.4 Dates and times

- **CLI-DATE-1** — WHEN `--date` is supplied, THE SYSTEM SHALL require a valid
  `YYYY-MM-DD` date and SHALL exit `2` for anything else.
- **CLI-DATE-2** — An explicit `--date` SHALL bypass clock-based rollover and
  SHALL be labelled as the requested civil date.
- **CLI-DATE-3** — `--24h` SHALL format every displayed time as `HH:mm`;
  otherwise times SHALL use `h:mm AM/PM`.
- **CLI-DATE-4** — `--date` SHALL be interpreted in `Asia/Karachi`, not the
  machine timezone.

### 3.5 Today card

- **CLI-CARD-1** — The card SHALL show the city, Hijri day and month (English
  and Urdu), Hijri year, Gregorian date, and weekday.
- **CLI-CARD-2** — The card SHALL show all six prayer times in canonical order.
- **CLI-CARD-3** — For the current display date, the card SHALL show the next
  event's label and a countdown in hours and minutes; when the next event is
  tomorrow's Fajr, the card SHALL say so. An explicit date that is not today
  SHALL show a date-lookup note instead of a countdown.
- **CLI-CARD-4** — The card SHALL show the confidence level and SHALL state that
  only `confirmed` is official when the level is not `confirmed`.
- **CLI-CARD-5** — WHEN the display date is in Ramadan, THE SYSTEM SHALL label
  Fajr as Sehri ends, label Maghrib as Iftar, show a highlighted Sehri/Iftar
  line, and allow the next event to be Sehri or Iftar. The Fajr and Maghrib rows
  and the next-event countdown SHALL use the offset-adjusted Sehri/Iftar
  instants, so the highlighted line and the rows never disagree.
- **CLI-CARD-6** — The card SHALL end with a short calculated-times disclaimer.
- **CLI-CARD-7** — WHEN the display date was advanced because the current
  instant is at or after Maghrib, THE SYSTEM SHALL say so on the card.
- **CLI-CARD-8** — Colour SHALL be enabled only for a TTY and only when
  `NO_COLOR` is unset and `--no-color` was not passed.
- **CLI-CARD-9** — WHEN Unicode is unavailable, THE SYSTEM SHALL fall back to
  ASCII labels and plain rules; meaning SHALL never depend on colour.
- **CLI-CARD-10** — The Urdu month name SHALL be rendered on its own line,
  right-aligned to the card width and wrapped in Unicode bidi isolates so
  mixed-direction text keeps its intended order. The ASCII fallback SHALL omit
  that line.

### 3.6 Plain text

- **CLI-PLAIN-1** — `--plain` SHALL print the same information as the card
  without box-drawing characters or colour.
- **CLI-PLAIN-2** — `--plain` SHALL remain readable when piped and SHALL place
  diagnostics on stderr only.

### 3.7 JSON

- **CLI-JSON-1** — `--json` SHALL print exactly one object to stdout and
  nothing else.
- **CLI-JSON-2** — The success payload SHALL contain `ok: true` and `data` with
  city, profile, Gregorian date, Hijri date and month names, confidence,
  `afterMaghrib`, six prayer times, `sehriIftar`, and `next`. During Ramadan the
  `fajr` and `maghrib` entries are the offset-adjusted Sehri and Iftar, matching
  the card.
- **CLI-JSON-3** — Prayer times and `next.at` SHALL be `HH:mm` in
  `Asia/Karachi`; `next` SHALL contain the event id, the display time, and
  whole minutes remaining, or SHALL be `null` for an explicit date that is not
  today.
- **CLI-JSON-4** — WHEN the display date is not Ramadan, `sehriIftar` SHALL be
  `null`; otherwise it SHALL contain `sehriEnds` and `iftar` as `HH:mm`.
- **CLI-JSON-5** — WHEN `--json` fails, THE SYSTEM SHALL print a single
  `{ "ok": false, "error": { "code", "message" } }` object to stderr and exit
  non-zero.
- **CLI-JSON-6** — JSON SHALL use stable field names and ordering, two-space
  indentation, and a trailing newline.

### 3.8 Errors and exit codes

- **CLI-ERR-1** — stdout SHALL carry only results: the card, plain text, JSON
  success, help, or version.
- **CLI-ERR-2** — Warnings, progress, and JSON errors SHALL go to stderr.
- **CLI-ERR-3** — Exit codes SHALL be `0` success, `1` unexpected or cancelled,
  `2` usage/config validation, `3` network or data unavailable, and `4` date out
  of coverage.
- **CLI-ERR-4** — WHEN the API is unavailable and no usable cache exists, THE
  SYSTEM SHALL exit `3` with a message naming the host and suggesting a retry.
- **CLI-ERR-5** — WHEN the date is outside coverage, THE SYSTEM SHALL exit `4`
  with the coverage start or a clear "not published yet" message.

## 4. Non-functional requirements

- **CLI-NFR-1** — Renderers SHALL be pure functions over a view model and an
  injected writer; they SHALL NOT fetch, read files, or inspect argv.
- **CLI-NFR-2** — Command handlers SHALL own flags, config, and exit codes, and
  SHALL compose the API, domain, and renderer without duplicating their logic.
- **CLI-NFR-3** — Golden tests SHALL freeze card, plain, JSON success, JSON
  error, and Ramadan output; goldens SHALL be regenerated only by an explicit
  update command.
- **CLI-NFR-4** — The suite SHALL remain deterministic and offline; onboarding
  tests SHALL inject prompt answers rather than driving a real TTY.
- **CLI-NFR-5** — The first interactive run SHALL make at most one network
  request before the today data loads (the city list).

## 5. Traceability

Each requirement is covered by a task in `tasks.md`. Rendering layout, prompt
wording, and error mapping are in `design.md`.
