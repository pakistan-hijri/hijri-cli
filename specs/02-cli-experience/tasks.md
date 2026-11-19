# 02 — CLI Experience: Tasks

Requirements: [`requirements.md`](./requirements.md). Design:
[`design.md`](./design.md).

Every task cites the requirement IDs it satisfies. A task is complete only when
its tests pass, `npm run lint` is clean, and the relevant golden files are
reviewed.

## 1. CLI shell and wiring

- [ ] **T1.1** Build `src/cli.ts` with commander, today options, `setup`,
      `config`, `--help`, `--version`, and `exitOverride()`. — `CLI-CMD-1`,
      `CLI-CMD-7`
- [ ] **T1.2** Map commander help/version to exit `0` and usage failures to exit
      `2`. — `CLI-CMD-7`, `CLI-ERR-3`
- [ ] **T1.3** Build the injected writer and warning sink; ensure stdout and
      stderr never cross. — `CLI-ERR-1`, `CLI-ERR-2`
- [ ] **T1.4** Map every `CliError` code to its exit code in one place.
      — `CLI-ERR-3`, `CLI-ERR-4`, `CLI-ERR-5`
- [ ] **T1.5** Reject `--midnight` with `--after-maghrib`; make `--json` win
      over `--plain`. — `CLI-PREC-4`, `CLI-JSON-1`

## 2. Configuration

- [ ] **T2.1** Implement config paths, precedence, zod schema, and defaults.
      — `CLI-ONB-6`, `CLI-PREC-1`, `CLI-PREC-3`
- [ ] **T2.2** Implement atomic save with `0o700`/`0o600` modes and clear.
      — `CLI-ONB-7`, `CLI-CMD-6`
- [ ] **T2.3** Implement `hijri config` with `--show`, setters, and `--clear`
      conflict rules. — `CLI-CMD-4`, `CLI-CMD-5`, `CLI-CMD-6`
- [ ] **T2.4** Validate `--city` against the API city list and profiles against
      the profile ids. — `CLI-CMD-5`, `CLI-ONB-2`
- [ ] **T2.5** Test precedence, one-off flags not persisting, invalid JSON,
      unreadable files, and clear. — `CLI-PREC-1`–`CLI-PREC-3`, `CLI-ONB-6`

## 3. Onboarding

- [ ] **T3.1** Implement the clack wrapper for city and profile selection.
      — `CLI-ONB-2`, `CLI-ONB-3`
- [ ] **T3.2** Implement the shared first-run/`setup` flow with cancellation
      before persistence. — `CLI-CMD-2`, `CLI-ONB-1`, `CLI-ONB-4`
- [ ] **T3.3** Reject `setup` outside a TTY with exit `2`. — `CLI-CMD-3`
- [ ] **T3.4** Use defaults plus a stderr warning for a non-TTY first run.
      — `CLI-ONB-5`
- [ ] **T3.5** Test onboarding with injected prompt answers, cancellation, and
      the one-city-list-request rule. — `CLI-ONB-1`–`CLI-ONB-5`, `CLI-NFR-4`,
      `CLI-NFR-5`

## 4. Today command

- [ ] **T4.1** Implement explicit-date validation and Asia/Karachi parsing.
      — `CLI-DATE-1`, `CLI-DATE-4`
- [ ] **T4.2** Resolve the display date via civil-day Maghrib and the saved or
      flagged convention. — `CLI-DATE-2`, `CLI-PREC-1`
- [ ] **T4.3** Load display-day calendar/prayer data and memoise year files.
      — `CLI-CMD-1`
- [ ] **T4.4** Select the next event, including next-day Fajr and its Ramadan
      label when the day is over. — `CLI-CARD-3`, `CLI-CARD-5`
- [ ] **T4.5** Build the view model with labels, confidence, Ramadan pair, and
      explicit-date flag. — `CLI-CARD-1`–`CLI-CARD-7`, `CLI-JSON-2`,
      `CLI-JSON-4`
- [ ] **T4.6** Test after-Maghrib display, midnight display, explicit past and
      future dates, next-day Fajr, and year-end rollover. — `CLI-DATE-2`,
      `CLI-CARD-3`, `CLI-CARD-7`

## 5. Renderers

- [ ] **T5.1** Implement 12/24-hour time, countdown, and weekday formatting in
      Asia/Karachi. — `CLI-DATE-3`, `CLI-JSON-3`
- [ ] **T5.2** Implement the card with title, rule, confidence, next, Ramadan
      line, after-Maghrib note, and disclaimer. — `CLI-CARD-1`–`CLI-CARD-7`
- [ ] **T5.3** Implement colour gating and the ASCII fallback.
      — `CLI-CARD-8`, `CLI-CARD-9`
- [ ] **T5.4** Implement plain output with no decoration and the same fields.
      — `CLI-PLAIN-1`, `CLI-PLAIN-2`
- [ ] **T5.5** Implement stable JSON success and error payloads.
      — `CLI-JSON-1`–`CLI-JSON-6`
- [ ] **T5.6** Add goldens for card, plain, JSON success, JSON error, Ramadan,
      after-Maghrib, ASCII fallback, and explicit-date/no-countdown.
      — `CLI-NFR-3`
- [ ] **T5.7** Add `npm run test:update` and document that goldens change only
      through it. — `CLI-NFR-3`
- [ ] **T5.8** Right-align the Urdu line, reverse it into visual RTL order under
      LRO/PDF, and omit it in ASCII; freeze it in the card and plain goldens.
      — `CLI-CARD-10`

## 6. Failure behaviour

- [ ] **T6.1** Ensure API failures exit `3`, out-of-coverage exits `4`, and
      usage/config errors exit `2`. — `CLI-ERR-3`, `CLI-ERR-4`, `CLI-ERR-5`
- [ ] **T6.2** Ensure `--json` failures print exactly one error object to stderr
      and nothing to stdout. — `CLI-JSON-5`, `CLI-ERR-1`, `CLI-ERR-2`
- [ ] **T6.3** Ensure `HIJRI_CLI_DEBUG=1` only affects stderr.
      — `CLI-ERR-2`
- [ ] **T6.4** Test stdout/stderr separation for success, warnings, and every
      error class. — `CLI-ERR-1`, `CLI-ERR-2`, `CLI-JSON-5`

## 7. Verification

- [ ] **T7.1** `npm run lint`, `npm test`, and `npm run build` pass.
      — `CLI-NFR-1`, `CLI-NFR-4`
- [ ] **T7.2** Manual smoke with a temporary config: non-TTY defaults, `setup`,
      today card, `--json | jq`, `--date`, `--24h`, `--offline`, and a bad city.
      Record the transcript in `docs/dev-runs/`. — `CLI-CMD-1`–`CLI-CMD-6`
- [ ] **T7.3** Confirm renderers import no API, filesystem, or prompt modules.
      — `CLI-NFR-1`
- [ ] **T7.4** Confirm commands contain no duplicated date, schedule, or
      formatting logic. — `CLI-NFR-2`
