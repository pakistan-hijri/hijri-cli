# Style Guide

Project-wide rules, applying to every milestone. Milestone-specific rationale
lives in `specs/<milestone>/design.md`; this file covers how code should *read*,
not what it should do. It is an adaptation of the project owner's Go standards
to TypeScript, with the [neatcode](https://github.com/shaheeranser/neatcode)
placement and refactoring practices folded in.

## 1. One concern per file

Each file holds one type, one adapter, or one clearly bounded piece of logic. If
you cannot name a file for what it does without reaching for "utils", "helpers",
or "common", it holds more than one concern.

**Bad** — a grab-bag whose only shared trait is that the functions are small:

```ts
// src/utils.ts
export function parseApiDate(s: string): Date { ... }
export function formatTime(iso: string): string { ... }
export function hashUrl(url: string): string { ... }
export function pickColor(confidence: Confidence): string { ... }
```

**Good** — one file per concern, named for the concern:

```ts
src/date/gregorian.ts        // civil date parsing and arithmetic
src/render/time.ts           // time formatting for the terminal
src/api/cache-key.ts         // stable cache-key derivation
src/render/theme.ts          // confidence and role colours
```

A type and the methods that belong to it are still one concern. The test is
whether a reader can describe the file's job in one sentence without saying
"and".

## 2. Placement before writing

Before adding code, run the neatcode placement protocol:

1. State the responsibility in one sentence.
2. Search for the module that already owns it; the module map is
   `specs/architecture.md` §5.
3. Match by responsibility, not by the file that happens to be open.
4. If nothing fits, create a module with a concrete name and a one-line
   responsibility docstring.

State the decision before writing: "Adding X to `path` because it owns Y." If
the sentence needs an "and", split the work.

## 3. Comments describe behaviour and intent

A comment exists to say what the code accomplishes for the system and why —
especially when the reason is not obvious. It must not restate operations the
reader can already see.

**Bad** — narrating the code back to the reader:

```ts
// Loop over the days and return the matching entry.
for (const [date, entry] of Object.entries(file.days)) {
  if (date === target) return entry;
}
```

**Good** — explaining why the loop exists, which the code cannot convey:

```ts
// The API keys days by Gregorian date, so a lookup is the contract; scanning is
// only a fallback for a hand-built fixture that omitted the key.
```

Every module starts with a one-line responsibility docstring. That is the only
block comment allowed. No banners, ASCII rules, or section headers.

## 4. Prefer self-explanatory code

If a better name or a clearer structure can carry the intent, do that instead of
writing a comment. A comment that exists only to explain a name is a signal to
rename.

```ts
// Bad
if (now.getTime() >= maghrib.getTime()) { ... }

// Good
const afterMaghrib = now.getTime() >= maghrib.getTime();
if (afterMaghrib) { ... }
```

## 5. TypeScript shape

- Strict TypeScript, including `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, `noImplicitOverride`, and
  `noFallthroughCasesInSwitch`.
- ESM only. Relative imports carry the `.js` extension.
- Named exports only. No default exports.
- No barrel files except a package's public surface. Import the module that owns
  the symbol.
- Prefer `unknown` over `any`; narrow explicitly with a type guard or schema.
- Do not use `!` to silence the checker. Handle the missing case.
- Prefer plain functions and small types. Add a class only when it owns state or
  a lifetime (a cache, a client).
- Soft thresholds, used as signals rather than verdicts: 400 code lines per
  file, 50 lines per function, cyclomatic complexity 10, nesting depth 4. A
  cohesive 500-line file can be better than six tangled fragments.

## 6. Tests are part of the design

Tests are written with the code, not bolted on afterwards.

- **Table-driven by default.** `test.each` rows carry a behaviour name and fixed
  inputs.
- **Golden files for anything that renders text or JSON.** They live in
  `testdata/` beside the renderer and are regenerated with an explicit command
  (`UPDATE_GOLDEN=1 npm test -- <pattern>`), so a diff is a reviewable artifact.
- **Deterministic and offline.** Fake `fetch`, freeze the clock, use temporary
  config/cache directories. No live API calls in unit tests.
- **Regression tests.** A bug fix includes a test that fails before the fix.
- **Test files sit beside the code**, named `<file>.test.ts`.

## 7. Inject what you depend on

A function takes what it needs — a `fetch` implementation, a clock, a writer, a
config, a cache — so a test can pass a fake and capture output. Reaching for
global `fetch`, `Date.now()`, `process.env`, or `process.stdout` inside logic
makes behaviour untestable.

```ts
// Good: the sink and clock are seams a test can fill.
export function renderToday(view: TodayView, out: Writer, now: Date): string { ... }

// Bad: the destination and time are welded in.
export function renderToday(view: TodayView): void {
  process.stdout.write(...);
}
```

Construction and wiring belong in `src/cli.ts` and `src/commands/`.

## 8. Errors and validation

- Validate untrusted external JSON at the boundary with zod. Trust the parsed
  type inward; do not re-check the same field in every function.
- Throw `CliError` with a stable code, a human message, an exit code, and the
  original error as `cause`.
- Never discard the original error. Wrap with enough context to locate the
  failure.
- When several independent things can be wrong, collect them and report them
  together rather than failing on the first.
- Expected bad input is an error to handle, not a crash. No `process.exit` inside
  domain, API, config, or render code; only the CLI entry point decides exit
  codes.
- A malformed API payload is a data error, not a stack trace on screen.

## 9. Naming and imports

- A type is exported only when another module genuinely needs it.
- Name files after their responsibility: `rollover.ts`, `next-event.ts`,
  `prayer-year.ts` — not `misc.ts`.
- Constants that mirror the external contract (profile ids, confidence values)
  live in one place and use the API's spelling.
- Prefer direct imports over re-export layers.

## 10. Dependencies

The standard library comes first. Add a dependency only when it does something
the standard library genuinely cannot, and record the reason in
`specs/architecture.md`. Current runtime dependencies and their justification:

| Dependency | Why |
|---|---|
| `commander` | Declarative commands, options, help, and version handling. |
| `@clack/prompts` | Accessible interactive select prompts; writing raw TTY handling would be larger and worse. |
| `picocolors` | Tiny ANSI colour support with `NO_COLOR` handling. |
| `zod` | Runtime validation of untrusted API JSON at the boundary. |

Dev dependencies (TypeScript, ESLint, Prettier, Vitest, tsx) are tooling, not
runtime surface.

## 11. Output hygiene

- **stdout carries only results.** Diagnostics, warnings, and JSON errors go to
  stderr, so `hijri --json | jq` always works.
- Honour `NO_COLOR`, `--no-color`, and non-TTY output. Colour is never the only
  signal; the confidence text and Ramadan labels carry meaning without it.
- Never print secrets, tokens, or full filesystem paths that are not user-facing
  configuration locations.

## 12. Security

- Treat API responses as hostile until zod has parsed them.
- Render remote strings as text. Do not pass them through a shell or interpret
  escape sequences.
- Cache keys are derived by hashing the full URL, so a crafted base URL cannot
  escape the cache directory.
- Write config and cache files under the user's own directories with restrictive
  permissions.
