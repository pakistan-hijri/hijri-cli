# 00 — Scaffolding

Milestone 00 is project hygiene, not product behaviour, so it has **no
`requirements.md` and no `design.md`**. This file is the complete checklist.

Scope note: this milestone creates repository metadata and the committed
standards. It contains no CLI behaviour. Every later milestone assumes these
files exist.

## 1. Repository files

### README.md

- [x] One-line description at the very top (what it is, who it is for).
- [x] Install and quickstart for `npx`, global install, and first-run setup.
- [x] Usage covering city, profile, date, convention, time format, JSON, plain,
      and config commands.
- [x] Ramadan section describing Sehri/Iftar labels and countdown.
- [x] Date-convention section stating the after-Maghrib default and
      `--midnight`.
- [x] Confidence table and the rule that only `confirmed` is official.
- [x] Configuration, cache, environment overrides, and JSON output contract.
- [x] Accuracy disclaimer and link to `hijri-api`.
- [x] Roadmap mirroring the milestones as checkboxes.
- [x] MIT badge and links to `CONTRIBUTING.md`, `AGENTS.md`, and `specs/`.

### LICENSE

- [x] MIT license text.
- [x] Copyright holder `Muhammad Shaheer` and year `2026`.

### CONTRIBUTING.md

- [x] Build and test commands: `npm ci`, `npm run lint`, `npm test`,
      `npm run build`.
- [x] Code style pointer to `specs/style-guide.md`.
- [x] Work-practice pointer to `specs/agent-practices.md`.
- [x] Guidance to open an issue before a non-trivial PR.
- [x] Tests required for new behaviour; regression test for bug fixes; offline
      and deterministic.
- [x] Note that low-effort/spam PRs will be closed rather than merged.
- [x] MIT contribution statement.

### AGENTS.md (repository root)

- [x] Tool-agnostic instructions for AI coding agents.
- [x] Read-the-spec-before-implementing rule and milestone order.
- [x] Build / test / lint commands.
- [x] TypeScript code style conventions.
- [x] Package layout overview.
- [x] Layer boundaries and the two output/data invariants.
- [x] Testing expectations, including golden files and offline fakes.
- [x] Commit hygiene and the no-agent-trailer rule.

### CODE_OF_CONDUCT.md

- [x] Contributor Covenant 2.1 text, adapted contact.

### SECURITY.md

- [x] Supported versions.
- [x] Private reporting route.
- [x] Scope covering untrusted API data, cache/config paths, terminal output,
      and secret handling.
- [x] Accuracy issues routed to `hijri-api` rather than treated as
      vulnerabilities.

### .gitignore

- [x] `node_modules/`, `dist/`, coverage, and TypeScript build info.
- [x] `.env` files.
- [x] Logs and local artifacts.
- [x] `/docs/` — uncommitted working notes, distinct from committed `specs/`.
- [x] Agent and editor local state.

### GitHub templates

- [x] `.github/ISSUE_TEMPLATE/bug_report.yml` — version/commit, command and
      config, expected vs actual, environment, redaction note.
- [x] `.github/ISSUE_TEMPLATE/feature_request.yml` — problem, proposal,
      alternatives, CLI-vs-data target.
- [x] `.github/ISSUE_TEMPLATE/config.yml` — route data issues to `hijri-api` and
      security issues to private reporting.
- [x] `.github/pull_request_template.md` — tests, lint, build, regression test,
      specs, focus, review notes.

### CI

- [ ] `.github/workflows/ci.yml` — added in Phase 2 with the package scaffold,
      because a docs-only commit has nothing to build. Runs lint, test, build,
      and a `--help` smoke on Node 22.

## 2. Committed standards

- [x] `specs/style-guide.md` — TypeScript shape, comments, placement, testing,
      dependencies, output hygiene, security.
- [x] `specs/agent-practices.md` — spec-first work, open decisions, commits,
      dev-run reports, live validation, boundaries, green build.
- [x] `specs/architecture.md` — system overview, data contract, module map,
      date semantics, config/cache, output contract, failure modes, testing.

## 3. Exit criteria

- [x] Every file above exists at its stated path.
- [ ] `npm run lint`, `npm test`, and `npm run build` pass once the package
      scaffold exists (Phase 2).
- [ ] CI is green on the first code commit.
- [ ] `docs/` exists locally but is **not** tracked by git.
- [ ] No CLI behaviour exists in this milestone.
