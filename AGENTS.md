# AGENTS.md

Instructions for AI coding agents working in this repository. This file is
tool-agnostic: nothing in it assumes a particular agent product, vendor, or
editor integration.

The committed, authoritative standards are
[`specs/style-guide.md`](./specs/style-guide.md) (how code should read) and
[`specs/agent-practices.md`](./specs/agent-practices.md) (how work is done).
This file is the entry point that points at them.

## Read the spec before you implement

`specs/` is the project's design documentation and is committed. Before
implementing a milestone's tasks, read that milestone's documents:

- `specs/<milestone>/requirements.md` — testable acceptance criteria (EARS-style
  "WHEN X, THE SYSTEM SHALL Y") with stable requirement IDs.
- `specs/<milestone>/design.md` — the rationale, interfaces, and failure modes.
  **Read this first.** It explains why a mechanism is shaped the way it is.
- `specs/<milestone>/tasks.md` — the checklist, with each task citing the
  requirement IDs it satisfies.

Start with [`specs/architecture.md`](./specs/architecture.md) for the system
overview and module map. Milestones are numbered and build on each other:
`00-scaffolding`, `01-data-client`, `02-cli-experience`. A later design may
reference an earlier one; earlier ones never depend on later ones, and you
should preserve that direction when editing.

Do not silently resolve an open decision. Each `design.md` ends with a numbered
`OD-xx` list. If your work depends on one, surface it rather than picking a
value you cannot justify.

## Build, test, lint

```sh
npm ci
npm run lint          # ESLint + tsc --noEmit
npm test              # Vitest, offline
npm run build         # tsc -> dist/
node dist/cli.js --help
```

All of these must pass before considering a change done. CI runs the same
commands on push and pull request.

## TypeScript code style

Project-wide rules for file structure and comments are in
[`specs/style-guide.md`](./specs/style-guide.md); the bullets below are the
TypeScript-specific expectations.

- Strict TypeScript with `noUncheckedIndexedAccess` and
  `exactOptionalPropertyTypes`; ESM only.
- Named exports only. No default exports, and no barrel files except a package's
  public surface.
- Prefer `unknown` over `any`; narrow explicitly. Do not use `!` to silence the
  checker.
- Comments explain why; each module starts with a one-line responsibility
  docstring. No banner comments.
- Wrap errors with context; never discard the original `cause`. Expected bad
  input is an error to handle, not a crash.
- No dependency where the standard library suffices. Record any addition in
  `specs/architecture.md`.

## Package layout

```
src/cli.ts              entry point: flags, command routing, wiring only
src/commands/           thin command handlers
src/config/             config file, paths, precedence, validation
src/api/                transport + cache + city/calendar/prayer loaders
src/domain/             pure resolution: Hijri date, schedule, next event
src/render/             pure output: card, plain text, JSON, time/theme helpers
src/onboard/            interactive prompts; returns config, does not persist
```

Dependency direction is `cli → commands → domain`, with `api` and `render` as
adapters. Domain code must not import the CLI framework, prompts, colours, or
filesystem. The authoritative module map is
[`specs/architecture.md`](./specs/architecture.md) §5.

## Boundaries you must respect

- **API client** — fetches, validates, caches, and returns typed data. It must
  not format output or read CLI flags.
- **Domain** — pure functions over typed data plus an injected clock. It must not
  fetch, read files, or print.
- **Renderer** — takes a resolved view model and an output sink. It must not
  fetch or decide policy.
- **Commands** — compose the three; they own flags, config, and exit codes.

Two invariants are easy to break:

1. **stdout carries only results.** Diagnostics, warnings, and JSON errors go to
   stderr, so `hijri --json | jq` always works.
2. **The CLI never merges or invents date/prayer data.** It reads the published
   `hijri-api` contract and surfaces its confidence; it does not compute
   alternative dates.

## Testing expectations

- Table-driven tests by default; table rows carry behaviour names and fixed
  inputs.
- Golden files for rendered text and JSON, stored in `testdata/` and regenerated
  by an explicit update command.
- Deterministic and offline: fake `fetch`, freeze the clock, and use temporary
  config/cache directories. No live API calls in unit tests.
- Bug fixes include a regression test that fails before the fix.
- A live smoke against `https://pakistan-hijri.github.io/hijri-api` is a manual
  verification step, never part of the test suite or CI.

## Commit hygiene

Do not add `Co-authored-by` trailers for agents or tooling. Commits should
reflect the humans responsible for the change. Use small, labelled commits
(`feat(scope):`, `fix(scope):`, `docs:`, `test:`, `chore:`) and leave the build
green at every commit.
