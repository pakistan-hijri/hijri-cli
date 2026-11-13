# hijri-cli

Today's Hijri date and prayer times for Pakistan, in your terminal.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

`hijri-cli` is a small, scriptable CLI built on
[`hijri-api`](https://github.com/shaheeranser/hijri-api). It shows the Hijri
date, the day's prayer times, the next prayer, and — during Ramadan — Sehri and
Iftar. Dates and times come from a static JSON API that records confirmed month
starts and calculates prayer times for Pakistani cities.

This project is partly inspired by [Ramadan CLI](https://github.com/ahmadawais/ramadan-cli) by Ahmad Awais.

## Install

```sh
npx hijri-cli

# or install globally
npm install -g hijri-cli
hijri
```

Requires Node 22 or newer.

## First run

The first interactive run asks for two things:

1. **City** — one of the cities published by `hijri-api` (`karachi`, `lahore`,
   `peshawar`, `quetta` today).
2. **Prayer profile** — `sunni_hanafi` (default), `sunni_asr1`, or
   `shia_jafari`.

The answers are saved to `~/.config/hijri-cli/config.json` (or
`$XDG_CONFIG_HOME/hijri-cli/config.json`). Re-run the flow with `hijri setup`.

Non-interactive runs with no saved config use Karachi and the Hanafi profile
without prompting, so scripts never hang.

## Usage

```sh
hijri                          # today's date and prayer times
hijri --city lahore            # one-off city, does not change saved config
hijri --profile shia_jafari    # one-off prayer profile
hijri --date 2026-03-01        # look up a specific civil date
hijri --midnight               # do not roll the Hijri date over at Maghrib
hijri --24h                    # 24-hour times
hijri --json                   # stable JSON for scripts
hijri --plain                  # no card or colours
hijri setup                    # change city and profile
hijri config --show            # print the saved configuration
hijri config --clear           # remove saved configuration
```

### Ramadan

During Ramadan the card labels Fajr as **Sehri ends** and Maghrib as **Iftar**,
adds a highlighted Sehri/Iftar line, and makes the next event a Sehri or Iftar
countdown. Outside Ramadan those rows read as ordinary Fajr and Maghrib.

### Date convention

By default the Islamic day rolls over at Maghrib: after today's Maghrib the CLI
shows the next Hijri date. Use `--midnight` for the civil-calendar date that
printed calendars use. An explicit `--date` is always a civil-day lookup.

Every date carries the API's confidence level:

| Level | Meaning |
|---|---|
| `confirmed` | A verified month-start record exists |
| `estimated` | A past month with no verified entry |
| `predicted` | A future month |
| `unconfirmed` | The last day, pending a sighting announcement |

Only `confirmed` dates are official. The CLI says so on screen and includes the
same status in `--json`.

## Configuration

| Setting | Flag | Environment | Default |
|---|---|---|---|
| City | `--city` | — | saved, then `karachi` |
| Prayer profile | `--profile` | — | saved, then `sunni_hanafi` |
| Date convention | `--midnight` / `--after-maghrib` | — | saved, then `after-maghrib` |
| Time format | `--24h` | — | saved, then `12h` |

Precedence is **flag > saved config > default**. One-off flags never overwrite
the saved configuration.

Data is cached under `~/.cache/hijri-cli/` (or `$XDG_CACHE_HOME`). When the
network is unavailable, the CLI falls back to stale cache with a warning on
stderr. `--no-cache` bypasses the cache; `--offline` forbids network access.

Environment overrides:

- `HIJRI_API_BASE_URL` — point at a local or alternate API build.
- `HIJRI_CLI_CONFIG_DIR` — use a different config directory.
- `HIJRI_CLI_CACHE_DIR` — use a different cache directory.
- `NO_COLOR` — disable colour.

## JSON output

`hijri --json` prints one object to stdout:

```json
{
  "ok": true,
  "data": {
    "city": "karachi",
    "profile": "sunni_hanafi",
    "gregorian": "2026-11-13",
    "hijri": {
      "date": "1448-06-02",
      "day": 2,
      "month": 6,
      "year": 1448,
      "monthName": { "en": "Jumada al-Thani", "ur": "جمادی الثانی" }
    },
    "confidence": "confirmed",
    "afterMaghrib": false,
    "prayers": {
      "fajr": "05:28",
      "sunrise": "06:47",
      "dhuhr": "12:16",
      "asr": "16:09",
      "maghrib": "17:45",
      "isha": "19:04"
    },
    "sehriIftar": null,
    "next": { "name": "maghrib", "at": "17:45", "minutes": 92 }
  }
}
```

Failures print an `{ "ok": false, "error": { "code", "message" } }` object to
stderr and exit non-zero.

## Accuracy

Dates are as reliable as their confidence level. Prayer times are **calculated,
not observed**: they are guidance, and your local mosque or imambargah is the
final authority. Sehri and Iftar use the same Fajr and Maghrib calculations with
the profile's precaution offsets.

The data contract, confidence model, source record, and audit trail live in
[`hijri-api`](https://github.com/shaheeranser/hijri-api). This CLI does not
maintain a second copy of any date or time.

## Roadmap

- [x] `00` — Repository scaffolding and project standards
- [x] `01` — Data client: API, cache, Hijri resolution, prayer schedule
- [x] `02` — CLI experience: onboarding, today view, Ramadan, JSON
- [ ] `03` — Ramadan month view, status line, shell completions

Design rationale, coding standards, and acceptance criteria live in
[`specs/`](./specs/). Contributors should start with
[`CONTRIBUTING.md`](./CONTRIBUTING.md); AI coding agents should start with
[`AGENTS.md`](./AGENTS.md).

## License

MIT — see [LICENSE](./LICENSE).
