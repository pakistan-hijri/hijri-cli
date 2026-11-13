# Agent practices

How work is done in this repository. These are project rules, not tool or
environment settings: they say what this codebase expects of anyone working on
it, and they are written for AI coding agents because that is often who is
implementing a milestone.

Normative code shape lives in [`style-guide.md`](./style-guide.md); the design
rationale lives in each milestone's `design.md` and in
[`architecture.md`](./architecture.md). Anything specific to one person's
machine or agent tooling — where a tool may write files, which editor or model is
used, local scratch locations — is not a project rule and does not belong here.

## 1. Read the spec before you implement

Each milestone in this directory is the design record: `requirements.md`
(testable acceptance criteria with stable IDs), `design.md` (rationale,
interfaces, failure modes — read this first), and `tasks.md` (the checklist,
each task citing the requirement IDs it satisfies). Implement against the spec,
not against a guess about what the feature should be.

Milestones build in order: a later `design.md` may reference an earlier one, but
an earlier one never depends on a later one. Preserve that direction when
editing.

## 2. Do not silently resolve an open decision

Every `design.md` ends with a numbered `OD-xx` list. These are choices the
project owner has reserved. Surface them — ask — rather than picking a value you
cannot justify. When one *is* decided, record the resolution and its reasoning
in the design, so the next reader does not have to rediscover it.

## 3. Ask when implementation demands it

If a task needs a decision the spec does not make, ask. Guessing produces work
that has to be undone, and buries a design choice inside an implementation.

## 4. Commits

- Small, focused commits made along the way, not one large commit at the end.
- Labelled, human-readable messages — `feat`, `fix`, `chore`, `docs`, `test` —
  with an optional scope, e.g. `feat(api): …`.
- One concern per commit, and a commit should build and pass tests on its own.
- No `Co-authored-by` trailers for agents or tooling. Commits reflect the
  humans responsible for the change.

## 5. Every run leaves a report

A development run is not finished until its report exists:

- `docs/dev-runs/<run>.md` — what was built, how it is shaped, how to run and
  test it, how it was validated against the live API, the commit walkthrough,
  and the known gaps.

`docs/` is intentionally untracked: it holds working records, while `specs/` is
the committed, normative documentation.

## 6. Validate against the real API

Green unit tests are necessary but not sufficient. A run is validated by driving
the built CLI against `https://shaheeranser.github.io/hijri-api` at least once:
today's date, a Ramadan date, and the `--json` output. Record the commands and
the result in the run report.

## 7. Report status honestly

The README describes the product's *full intended scope*. What exists versus
what is still a gap belongs in the run report. Never describe a capability as
achieved when a later milestone owns it, and do not soften the README to match a
partial implementation.

## 8. Change as little as the spec requires

Make the smallest change that satisfies the requirement. Do not add features,
configurability, or abstractions the task did not ask for, and do not pre-build
for hypothetical future milestones. Delete code that is no longer used rather
than leaving compatibility shims. The milestone that needs something adds it.

## 9. Respect the boundaries

The layers are `cli → commands → domain`, with `api` and `render` as adapters.
The API client validates and returns typed data; it does not format. Domain code
is pure and does not fetch, read files, or print. Renderers take a view model and
an output sink; they do not fetch or decide policy. Commands compose the three.

Two invariants are load-bearing and must not be bypassed:

1. **stdout carries only results.** Diagnostics, warnings, and JSON errors go to
   stderr, so `hijri --json | jq` always works.
2. **The CLI never merges or invents date/prayer data.** It reads the published
   `hijri-api` contract and surfaces its confidence; it does not compute an
   alternative calendar or prayer method.

## 10. Leave the build green

Before considering work done: `npm run lint` (ESLint and `tsc --noEmit`),
`npm test`, and `npm run build` all pass, and `node dist/cli.js --help`
succeeds. Run them yourself; do not rely on CI to catch a failure you could have
seen locally.

## 11. Refactoring

Follow the neatcode procedure: pin behaviour with tests, extract one module at a
time, run the tests, and keep refactoring separate from behaviour changes. Never
rewrite a large module in a single pass, never weaken a failing test to make a
refactor pass, and do not add an abstraction for a hypothetical third case.
