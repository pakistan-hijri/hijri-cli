# Security Policy

## Supported versions

`hijri-cli` is pre-1.0. Only the latest published version is supported — please
reproduce against it before reporting.

| Version | Supported |
|---|---|
| Latest release (`0.x`) | Yes |
| `main` at the current commit | Yes |
| Anything older | No |

## Reporting a vulnerability

Please **do not open a public issue** for a security problem.

Use GitHub's private vulnerability reporting on this repository:
[Report a vulnerability](https://github.com/shaheeranser/hijri-cli/security/advisories/new).
If that form is unavailable, email shaheer.anser@gmail.com with `hijri-cli
security` in the subject.

Include, as far as you can: the version or commit, the command you ran, the
city/profile involved, a minimal reproduction, and the impact you believe it
has.

## What to expect

This is a small project maintained by one person. Acknowledgement is targeted
within a week, and a fix for a confirmed issue as soon as practical. You will be
credited in the advisory unless you ask not to be.

## Scope

`hijri-cli` reads untrusted JSON from a remote API and writes local config and
cache files. The following areas are worth looking at:

- **API payload handling** — responses are untrusted. A crafted response must
  not crash the CLI, exhaust memory, or inject terminal control sequences.
- **Cache and config paths** — cache keys are derived from URLs. A malicious
  base URL or crafted key must not write outside the cache directory.
- **Terminal output** — remote strings rendered to a TTY must not be able to
  spoof or corrupt the terminal.
- **Secret handling** — the CLI holds no credentials today. If that changes, a
  future version must not log, cache, or echo them.

Out of scope: the accuracy or official status of dates and prayer times. Those
are data-quality issues for [`hijri-api`](https://github.com/shaheeranser/hijri-api),
not security vulnerabilities in this CLI.
