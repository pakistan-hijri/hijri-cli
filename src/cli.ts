#!/usr/bin/env node
/** CLI entry point: flags, command routing, dependency wiring, exit codes. */

import { Command, CommanderError } from "commander";
import { FileCache } from "./api/cache.js";
import { DEFAULT_BASE_URL, HijriApi } from "./api/client.js";
import { runCalendar } from "./commands/calendar.js";
import { runConfig } from "./commands/config.js";
import { runSetup } from "./commands/setup.js";
import { runToday } from "./commands/today.js";
import type { TodayFlags } from "./commands/today.js";
import { resolveCacheDir, resolveConfigPath } from "./config/paths.js";
import { toCliError } from "./errors.js";
import { createClackPrompts } from "./onboard/prompts.js";
import { renderJsonError } from "./render/json.js";
import { supportsUnicode } from "./render/theme.js";
import { createWriter } from "./render/writer.js";
import { VERSION } from "./version.js";

interface CliOptions {
  city?: string;
  profile?: string;
  date?: string;
  midnight?: boolean;
  afterMaghrib?: boolean;
  "24h"?: boolean;
  json?: boolean;
  plain?: boolean;
  color?: boolean;
  cache?: boolean;
  offline?: boolean;
}

interface CalendarCliOptions {
  month?: string;
  year?: string;
  city?: string;
  profile?: string;
  "24h"?: boolean;
  json?: boolean;
  plain?: boolean;
}

async function main(): Promise<void> {
  const program = new Command();
  const writer = createWriter();
  const configPath = resolveConfigPath(process.env);
  const isTTY = Boolean(process.stdin.isTTY && process.stdout.isTTY);

  program
    .name("hijri")
    .description("Today's Hijri date and prayer times for Pakistan.")
    .version(VERSION)
    .option("--city <id>", "one-off city lookup")
    .option("--profile <id>", "one-off prayer profile")
    .option("--date <YYYY-MM-DD>", "look up a specific civil date")
    .option("--midnight", "do not roll over at Maghrib")
    .option("--after-maghrib", "roll over at Maghrib (default)")
    .option("--24h", "use 24-hour times")
    .option("--json", "print machine-readable JSON")
    .option("--plain", "print plain text without a card")
    .option("--no-color", "disable colour")
    .option("--no-cache", "bypass the cache")
    .option("--offline", "use only cached data")
    .exitOverride()
    .configureOutput({
      writeOut: (text) => {
        writer.out(text);
      },
      writeErr: (text) => {
        writer.err(text);
      },
    })
    .action(async () => {
      const options = program.opts<CliOptions>();
      const flags: TodayFlags = {
        ...(options.city === undefined ? {} : { city: options.city }),
        ...(options.profile === undefined ? {} : { profile: options.profile }),
        ...(options.date === undefined ? {} : { date: options.date }),
        midnight: options.midnight === true,
        afterMaghrib: options.afterMaghrib === true,
        h24: options["24h"] === true,
        json: options.json === true,
        plain: options.plain === true,
      };
      const api = createApi(options, writer.err);
      await runToday(flags, {
        api,
        configPath,
        prompts: createClackPrompts(),
        writer,
        now: () => new Date(),
        isTTY,
        colorEnabled:
          options.color !== false &&
          Boolean(process.stdout.isTTY) &&
          process.env.NO_COLOR === undefined,
        unicode: supportsUnicode(process.env),
      });
    })
    .addHelpText(
      "after",
      `
Examples:
  $ hijri
  $ hijri --city lahore --24h
  $ hijri --date 2026-03-01 --json
  $ hijri calendar --month 9 --year 1448
  $ hijri setup
  $ hijri config --city lahore --profile shia_jafari
`,
    );

  program
    .command("setup")
    .description("choose a city and prayer profile")
    .action(async () => {
      const options = program.opts<CliOptions>();
      const api = createApi(options, writer.err);
      await runSetup({
        api,
        configPath,
        prompts: createClackPrompts(),
        writer,
        isTTY,
      });
    });

  program
    .command("config")
    .description("show, update, or clear saved configuration")
    .option("--show", "show the saved configuration")
    .option("--clear", "remove the saved configuration")
    .option("--city <id>", "save a city")
    .option("--profile <id>", "save a prayer profile")
    .option("--convention <mode>", "save after-maghrib or midnight")
    .option("--time-format <format>", "save 12h or 24h")
    .action(async (options: Record<string, unknown>) => {
      const root = program.opts<CliOptions>();
      const api = createApi(root, writer.err);
      await runConfig(
        {
          show: options.show === true,
          clear: options.clear === true,
          ...(typeof options.city === "string" ? { city: options.city } : {}),
          ...(typeof options.profile === "string"
            ? { profile: options.profile }
            : {}),
          ...(typeof options.convention === "string"
            ? { convention: options.convention }
            : {}),
          ...(typeof options.timeFormat === "string"
            ? { timeFormat: options.timeFormat }
            : {}),
        },
        { api, configPath, writer },
      );
    });

  program
    .command("calendar")
    .description("show a Hijri month calendar")
    .option("--month <1-12>", "Hijri month number")
    .option("--year <year>", "Hijri year")
    .option("--city <id>", "one-off city lookup")
    .option("--profile <id>", "one-off prayer profile")
    .option("--24h", "use 24-hour times")
    .option("--json", "print machine-readable JSON")
    .option("--plain", "print plain text without a card")
    .action(async (local: CalendarCliOptions) => {
      const root = program.opts<CliOptions>();
      const api = createApi(root, writer.err);
      const city = pick(local.city, root.city);
      const profile = pick(local.profile, root.profile);
      await runCalendar(
        {
          ...(local.month === undefined ? {} : { month: local.month }),
          ...(local.year === undefined ? {} : { year: local.year }),
          ...(city === undefined ? {} : { city }),
          ...(profile === undefined ? {} : { profile }),
          h24: pick(local["24h"], root["24h"]) === true,
          json: pick(local.json, root.json) === true,
          plain: pick(local.plain, root.plain) === true,
        },
        {
          api,
          configPath,
          prompts: createClackPrompts(),
          writer,
          now: () => new Date(),
          isTTY,
          colorEnabled:
            root.color !== false &&
            Boolean(process.stdout.isTTY) &&
            process.env.NO_COLOR === undefined,
          unicode: supportsUnicode(process.env),
        },
      );
    });

  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    if (error instanceof CommanderError) {
      process.exitCode = error.exitCode === 0 ? 0 : 2;
      return;
    }

    const cliError = toCliError(error);
    process.exitCode = cliError.exitCode;
    if (process.argv.includes("--json")) {
      writer.err(renderJsonError(cliError.code, cliError.message));
    } else {
      writer.err(`${cliError.message}\n`);
    }
    if (process.env.HIJRI_CLI_DEBUG === "1" && cliError.cause !== undefined) {
      writer.err(`${describeCause(cliError.cause)}\n`);
    }
  }
}

function describeCause(cause: unknown): string {
  if (cause instanceof Error) {
    return cause.stack ?? cause.message;
  }
  if (typeof cause === "string") {
    return cause;
  }
  try {
    return JSON.stringify(cause);
  } catch {
    return "Unknown cause";
  }
}

function pick<T>(local: T | undefined, root: T | undefined): T | undefined {
  return local === undefined ? root : local;
}

function createApi(
  options: CliOptions,
  warn: (message: string) => void,
): HijriApi {
  const offline = options.offline === true;
  const noCache = options.cache === false;
  const now = () => new Date();
  const cache = new FileCache({
    dir: resolveCacheDir(process.env),
    now,
    warn,
    offline,
    noCache,
  });
  return new HijriApi({
    baseUrl: process.env.HIJRI_API_BASE_URL ?? DEFAULT_BASE_URL,
    cache,
    fetch: globalThis.fetch,
    warn,
    offline,
  });
}

void main();
