# hijri-cli

Today's Hijri date and prayer times for Pakistan, in your terminal.

`hijri-cli` reads the published [`hijri-api`](https://github.com/pakistan-hijri/hijri-api) data and prints a readable card or stable JSON. It shows the current Hijri date, the day's prayer times, the next prayer, and Sehri/Iftar labels during Ramadan.

## Install

```sh
npx hijri-cli
```

Or install globally:

```sh
npm install -g hijri-cli
hijri
```

Requires Node 22 or newer.

## Quick start

```sh
hijri
hijri --city lahore --24h
hijri calendar
hijri calendar --month 9 --year 1448
hijri --json
hijri setup
```

On first interactive run, `hijri` asks for a city and prayer profile. Non-interactive runs use Karachi and `sunni_hanafi` without prompting, so scripts never hang. Change saved settings later with `hijri setup` or `hijri config --city karachi --profile sunni_asr1`.

## Commands

| Command | Purpose |
|---|---|
| `hijri` | Today's date, prayer times, and next event |
| `hijri calendar` | Current Hijri month grid |
| `hijri setup` | Choose city and prayer profile |
| `hijri config --show` | Print effective configuration |
| `hijri config --city <id> --profile <id>` | Update saved configuration |
| `hijri config --clear` | Remove saved configuration |

## Flags

| Flag | Effect |
|---|---|
| `--city <id>` | One-off city lookup |
| `--profile <id>` | One-off prayer profile: `sunni_hanafi`, `sunni_asr1`, or `shia_jafari` |
| `--date <YYYY-MM-DD>` | Look up a civil date; no countdown is shown |
| `--midnight` | Use the civil date instead of rolling over at Maghrib |
| `--after-maghrib` | Roll over at Maghrib (default) |
| `--24h` | Use 24-hour times in human output |
| `--json` | Print machine-readable JSON |
| `--plain` | Print undecorated text without colour |
| `--no-color` | Disable colour |
| `--no-cache` | Bypass cache reads and writes |
| `--offline` | Use cached data only |

`--json` wins over `--plain`. One-off flags never change saved configuration.

## Calendar

`hijri calendar` prints a Monday-first Hijri month grid with Gregorian day numbers, the current day marked `*`, a confidence summary, and a NOW strip with the next event and active profile. `--24h` changes the NOW strip's time; `--profile` changes the legend. Neither changes calendar dates or JSON.

During Ramadan, Fajr is labelled **Sehri ends**, Maghrib is labelled **Iftar**, and the next event uses those labels.

## Configuration

Settings resolve in this order: flag, saved config, default. The saved file is `~/.config/hijri-cli/config.json`, or `$XDG_CONFIG_HOME/hijri-cli/config.json`.

Data is cached under `~/.cache/hijri-cli/`, or `$XDG_CACHE_HOME/hijri-cli/`. When the network is unavailable, the CLI falls back to stale cache with a warning on stderr.

Environment overrides:

| Variable | Purpose |
|---|---|
| `HIJRI_API_BASE_URL` | Use a different API base URL |
| `HIJRI_CLI_CONFIG_DIR` | Use a different config directory |
| `HIJRI_CLI_CACHE_DIR` | Use a different cache directory |
| `HIJRI_CLI_RTL` | Force `logical` or `visual` Urdu rendering |
| `NO_COLOR` | Disable colour |

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

`hijri calendar --json` uses the same envelope with a `days` array. Failures print an `{ "ok": false, "error": { "code", "message" } }` object to stderr and exit non-zero. Diagnostics never go to stdout.

## Accuracy

Dates carry the API's confidence level:

| Level | Meaning |
|---|---|
| `confirmed` | A verified month-start record exists |
| `estimated` | A past month with no verified entry |
| `predicted` | A future month |
| `unconfirmed` | The last day, pending a sighting announcement |

Only `confirmed` dates are official. Prayer times are calculated, not observed; they are guidance, and your local mosque or imambargah is the final authority. Sehri and Iftar use the same Fajr and Maghrib calculations with the profile's precaution offsets.

The CLI does not maintain a second copy of any date or time.

## License

MIT — see [LICENSE](./LICENSE).
