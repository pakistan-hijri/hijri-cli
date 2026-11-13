# Contributing

Thanks for taking the time to contribute. This document covers how to build and
test `hijri-cli` locally, the code style we expect, and how to get a change
merged.

## Before you open a PR

**Open an issue first for anything non-trivial.** A new command, a change to the
output contract, a new dependency, or anything touching the API boundary should
be discussed before code is written. This keeps implementation aligned with the
design in `specs/`.

Small, obviously-correct fixes (typos, a clear bug with an obvious fix, a missing
test for existing behaviour) can go straight to a PR.

## Building and testing

`hijri-cli` is a TypeScript ESM project. Node 22 or newer is required.

```sh
npm ci
npm run lint          # ESLint + tsc --noEmit
npm test              # Vitest, offline
npm run build         # tsc -> dist/
node dist/cli.js --help
```

All four must pass. CI runs lint, tests, build, and a `--help` smoke test on
every push and pull request.

Useful while iterating:

```sh
npm run test:watch
npm run test -- src/api/cache.test.ts
npm run dev -- --date 2026-03-01
```

Tests must not require the network. The data client takes a fetch function and
a clock as parameters; use fakes in tests and keep trimmed real fixtures under
`src/**/testdata/`.

## Code style

The project-wide rules for file structure, comments, TypeScript shape, testing,
and dependencies are in [`specs/style-guide.md`](./specs/style-guide.md). How
work is done — spec-first, open decisions, commit hygiene, dev-run reports — is
in [`specs/agent-practices.md`](./specs/agent-practices.md), which applies to
human contributors as much as to agents.

The short version:

- One concern per file. No `utils`, `helpers`, or `common` buckets.
- Comments explain **why**, not what. No banners or decorative headers.
- Strict TypeScript. Prefer `unknown` over `any`; no non-null assertions to quiet
  the checker.
- Inject `fetch`, clocks, writers, and paths into logic so behaviour is testable.
- Validate untrusted external JSON at the boundary with zod.
- Standard library first. A new dependency needs a recorded reason.
- `npm run lint`, `npm test`, and `npm run build` must be green before review.

Before starting on a milestone, read its design document in `specs/` — for
example `specs/01-data-client/design.md` — since it records *why* the interfaces
are shaped the way they are.

## Tests

- New behaviour needs tests. Bug fixes need a regression test that fails before
  the fix.
- Table-driven tests are the default (`test.each`).
- Anything that renders text gets a golden file in `testdata/` and an update
  command, so a diff is reviewable.
- Tests are deterministic and offline. Freeze time and stub `fetch`; never call
  the live API from a unit test.

## Submitting a pull request

1. Fork the repository and branch from `main`.
2. Make your change, including tests and any spec updates it implies.
3. Run `npm run lint`, `npm test`, and `npm run build`.
4. Open the PR and fill in the checklist. Link the issue it addresses.
5. Keep the PR focused. Unrelated refactors belong in their own PR.

A maintainer will review, may ask for changes, and will merge when it is ready.

## What gets closed

Low-effort and spam pull requests will be closed rather than merged. That
includes PRs that only reformat files without a stated reason, drive-by
dependency bumps with no explanation, changes that add no tests for new
behaviour, and anything that ignores the design in `specs/`. This is not
personal — it keeps the review queue usable. If in doubt, open an issue and ask
first.

## License

By contributing, you agree that your contributions are licensed under the MIT
License (see [LICENSE](./LICENSE)).
