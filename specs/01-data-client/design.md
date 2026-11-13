# 01 — Data Client: Design

Requirements: [`requirements.md`](./requirements.md). Tasks:
[`tasks.md`](./tasks.md).

Dependencies: milestone 00 (scaffolding). This milestone does not render, prompt,
or read CLI flags.

## 1. Goals and constraints

The data layer has three jobs: fetch the published contract, validate it once at
the boundary, and keep it available when the network is not. It must be usable
from tests without a network, a real home directory, or the wall clock.

The external constraint is the `hijri-api` JSON shape. The API is static and
additive: new years, cities, and profiles appear over time. The client therefore
treats ids as data where possible and treats the profile list as a recorded
contract constant.

## 2. Interfaces

```ts
type Confidence = "confirmed" | "estimated" | "predicted" | "unconfirmed";
type Convention = "after-maghrib" | "midnight";

interface HijriDay {
  hijri: string;
  year: number;
  month: number;
  day: number;
  monthName: { en: string; ur: string };
  confidence: Confidence;
  sources?: string[];
}

interface PrayerTimes {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}

interface PrayerDay {
  date: string;
  times: PrayerTimes;
}

interface PrayerMeta {
  city: string;
  cityName: string;
  province: string;
  profile: ProfileId;
  profileLabel: string;
  timezone: string;
  sehriOffsetMin: number;
  iftarOffsetMin: number;
  disclaimer: string;
}

interface NextEvent {
  id: PrayerId;
  at: string;
  minutes: number;
}

interface SehriIftar {
  sehriEnds: string;
  iftar: string;
}
```

`HijriDay` and `PrayerDay` are domain types. The zod schemas in
`src/api/schema.ts` describe the wire shapes (`month_name`,
`sehri_offset_min`) and are mapped into these camelCase types at the API
boundary, so the rest of the code never sees snake_case fields.

## 3. HTTP and cache

### 3.1 Request policy

`src/api/http.ts` exposes:

```ts
interface HttpDeps {
  fetch: typeof globalThis.fetch;
  timeoutMs?: number;
  retries?: number;
}

async function fetchJson(url: string, deps: HttpDeps): Promise<unknown>;
```

- A 10-second timeout is enforced with an `AbortController` and a cleared timer.
- Network errors and 5xx responses retry once. 4xx responses fail immediately.
- Non-2xx responses throw `HttpError` with `url`, `status`, and a short message.
- The body is parsed with `JSON.parse`; malformed JSON throws `DataError`.
- The returned value is `unknown`; the caller's zod schema is the only thing that
  gives it a type.

### 3.2 Cache envelope

```json
{
  "url": "https://…/hijri/calendar/1448.json",
  "fetchedAt": "2026-11-13T09:00:00.000Z",
  "body": { }
}
```

`src/api/cache-key.ts` derives `sha256(url).hex + ".json"`. `src/api/cache.ts`
owns reads, writes, TTL checks, and stale reads:

```ts
interface CacheDeps {
  dir: string;
  now: () => Date;
  noCache?: boolean;
  offline?: boolean;
  warn: (message: string) => void;
}

class FileCache {
  getFresh(url: string, ttlMs: number): Promise<unknown | undefined>;
  getStale(url: string): Promise<unknown | undefined>;
  set(url: string, body: unknown): Promise<void>;
}
```

- `getFresh` returns `undefined` for a missing, invalid, or expired envelope.
- `getStale` returns any valid envelope regardless of age.
- `set` creates the directory with mode `0o700`, writes a temporary file with
  mode `0o600`, and renames it into place. If a platform refuses to replace an
  existing file, the implementation unlinks and renames once; the race is
  documented, not hidden.
- A corrupt envelope is treated as a miss and, when possible, overwritten.
- `offline` makes the client call `getStale` only; `noCache` bypasses both.

### 3.3 Read path

`src/api/client.ts` composes transport, cache, and validation:

```ts
class HijriApi {
  constructor(deps: ApiDeps);
  cities(): Promise<City[]>;
  calendarIndex(): Promise<CalendarIndex>;
  calendarYear(year: number): Promise<CalendarFile>;
  prayerYear(city: string, profile: ProfileId, year: number): Promise<PrayerFile>;
  calendarDay(date: string): Promise<HijriDay>;
  prayerDay(city: string, profile: ProfileId, date: string): Promise<PrayerDay>;
}
```

Read order for each route:

1. Fresh cache (unless `offline` is set, in which case stale cache is the only
   source).
2. Network (unless `offline`).
3. On network/5xx failure, stale cache, with a warning that includes the age.
4. Otherwise, a typed error.

Schema failures do not fall back to stale data: a malformed published contract
is a real data problem and should be visible.

TTLs:

| Route | TTL |
|---|---|
| cities, calendar index | 7 days |
| calendar year | 12 hours |
| prayer year | 30 days |

All TTLs and limits are open decisions recorded in §10.

## 4. Calendar selection

The API publishes calendar files per Hijri year but keys days by Gregorian date.
A lookup needs the right file before it can ask for the right key.

`src/api/year-selection.ts` estimates the Hijri year with the same baseline the
API uses:

```ts
new Intl.DateTimeFormat("en", {
  calendar: "islamic-umalqura",
  timeZone: "Asia/Karachi",
  year: "numeric",
}).formatToParts(new Date(`${date}T12:00:00Z`))
```

The estimate is tried first, then `estimate - 1`, `estimate + 1`, and finally
every year listed in the index, de-duplicated. The first file whose `days` map
contains the date wins. Files are cached individually.

If the date is before `coverage_start`, the lookup throws `OutOfRangeError`
immediately, without fetching a year file. If no listed year contains the date,
it throws `DataUnavailableError` explaining that the date is not published yet.
The exact API entry is returned unchanged: the client never adjusts a date or
confidence.

## 5. Date and rollover

`src/domain/calendar.ts` owns civil-date arithmetic and rollover:

```ts
function todayInPakistan(now: Date): string;
function addDays(date: string, days: number): string;
function isValidIsoDate(value: string): boolean;
function gregorianYear(date: string): number;
function resolveDisplayDate(input: {
  now: Date;
  civilDate: string;
  convention: Convention;
  maghrib: string | undefined;
  explicitDate: boolean;
}): { displayDate: string; afterMaghrib: boolean };
```

`todayInPakistan` formats an injected instant with `timeZone: "Asia/Karachi"`,
never the machine zone. `addDays` uses UTC arithmetic on the date parts, so it is
unaffected by daylight-saving changes in other zones.

Rollover rules:

- An explicit `--date` is always the display date; `afterMaghrib` is false.
- `midnight` keeps the civil date; `afterMaghrib` is false.
- `after-maghrib` advances one day when `now >= maghrib` for the civil date.
- A missing Maghrib time keeps the civil date and does not invent a boundary.

## 6. Schedule calculations

`src/domain/schedule.ts` is pure:

```ts
const PRAYER_IDS = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"] as const;

function orderedEvents(day: PrayerDay): { id: PrayerId; at: string }[];
function nextEvent(now: Date, day: PrayerDay): NextEvent | null;
function sehriIftar(day: PrayerDay, meta: PrayerMeta, month: number): SehriIftar | null;
```

- `orderedEvents` reads the six ISO instants in canonical order.
- `nextEvent` returns the first instant strictly after `now`, with
  `minutes = max(0, ceil((at - now) / 60000))`. It returns `null` when the whole
  day has passed; the command then asks for the next day's Fajr, loading the
  next Gregorian year when required.
- `sehriIftar` returns `null` outside Ramadan. Inside Ramadan it adds the
  published offsets to Fajr and Maghrib. The Jafari profile's `-10` Sehri offset
  is therefore applied exactly as the API intends.
- The module returns instants and ids only. `src/render/time.ts` owns 12/24-hour
  formatting and countdown text.

## 7. Validation

`src/api/schema.ts` mirrors the wire contract with zod. Invalid payloads throw
`DataError` with the route and a short reason; the original zod error is the
`cause`. Schemas validate structure and obvious ranges, not policy:

- confidence is one of the four published values;
- month is 1–12, day is 1–30;
- prayer days contain all six time strings;
- offsets are finite numbers;
- cities contain the fields onboarding needs.

Unknown extra fields are ignored, so the API stays additive.

## 8. Errors

`src/errors.ts` defines:

```ts
class CliError extends Error {
  code: string;       // "usage" | "network" | "out_of_range" | "data_unavailable" | "config" | "unexpected"
  exitCode: number;   // 2 | 3 | 4 | 1
  cause?: unknown;
}
```

The API throws domain-specific subclasses or `CliError` directly. Messages name
the route or city/profile/year involved. No layer calls `process.exit`; the CLI
entry point maps `exitCode`.

## 9. Failure modes

| Failure | Behaviour |
|---|---|
| Timeout | Retry once, then stale cache, then `network` error. |
| 5xx | Retry once, then stale cache, then `network` error. |
| 4xx | No retry; `network`/`data_unavailable` error naming status and route. |
| Malformed JSON | `data` error; no stale fallback. |
| Schema mismatch | `data` error naming the route; no stale fallback. |
| Cache envelope corrupt | Treat as a miss; fetch or fail. |
| Cache directory unwritable | Warn and continue with network-only data. |
| No cache, offline | `network` error explaining offline mode. |
| Date before coverage | `out_of_range` with `coverage_start`. |
| Date after published years | `data_unavailable`. |
| Prayer year missing | `data_unavailable` naming city/profile/year. |

## 10. Testing strategy

- Table-driven tests for date arithmetic, rollover, year selection, TTLs,
  offsets, and next-event selection.
- Fake `fetch` returns fixture payloads; fake clocks are fixed `Date` values.
- Temporary cache/config directories under `os.tmpdir()`, removed after each
  test.
- Goldens for the cache envelope shape and JSON output live with their renderer;
  this milestone tests values, not terminal text.
- One manual live smoke against the deployed API, recorded in the run report.

## 11. Open decisions

- **OD-01-1 — TTLs.** *Resolved:* 7 days for cities/index, 12 hours for
  calendar, 30 days for prayer. Calendar confirmations are the only frequently
  changing data.
- **OD-01-2 — Retry policy.** *Resolved:* one retry, network and 5xx only. A
  4xx is a contract or input problem; retrying it hides the cause.
- **OD-01-3 — Timeout.** *Resolved:* 10 seconds per attempt.
- **OD-01-4 — Stale fallback.** *Resolved:* allowed for network/5xx only, with a
  stderr warning. Schema failures stay visible.
- **OD-01-5 — Cache format.** *Resolved:* one URL-keyed JSON envelope. A single
  file per route is easier to inspect and delete than a directory tree.
- **OD-01-6 — Year estimation.** *Resolved:* `islamic-umalqura` via `Intl`, with
  adjacent-year fallback. It matches the API's declared baseline and needs no
  dependency.
