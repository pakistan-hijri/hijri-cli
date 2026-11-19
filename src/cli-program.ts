/** Commander wiring extracted so flag parsing can be tested without I/O. */

import { Command } from "commander";
import { DEFAULT_BASE_URL, HijriApi } from "./api/client.js";
import type { runCalendar } from "./commands/calendar.js";
import type { CalendarFlags } from "./commands/calendar.js";
import type { runConfig } from "./commands/config.js";
import type { runSetup } from "./commands/setup.js";
import type { runToday } from "./commands/today.js";
import type { TodayFlags } from "./commands/today.js";
import { resolveCacheDir } from "./config/paths.js";
import { FileCache } from "./api/cache.js";
import type { OnboardPrompts } from "./onboard/prompts.js";
import { supportsUnicode } from "./render/theme.js";
import type { Writer } from "./render/writer.js";
import { VERSION } from "./version.js";

export interface CliOptions {
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

export interface ProgramHandlers {
  today: typeof runToday;
  calendar: typeof runCalendar;
  config: typeof runConfig;
  setup: typeof runSetup;
}

interface RuntimeDeps {
  api: HijriApi;
  configPath: string;
  prompts: OnboardPrompts;
  writer: Writer;
  now: () => Date;
  isTTY: boolean;
  colorEnabled: boolean;
  unicode: boolean;
}

export interface ProgramDeps {
  writer: Writer;
  configPath: string;
  env: NodeJS.ProcessEnv;
  isTTY: boolean;
  stdoutIsTTY: boolean;
  prompts: OnboardPrompts;
  now: () => Date;
  apiFactory: (options: CliOptions, warn: Writer["err"]) => HijriApi;
  handlers: ProgramHandlers;
}

export function createProgram(deps: ProgramDeps): Command {
  const program = new Command();

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
        deps.writer.out(text);
      },
      writeErr: (text) => {
        deps.writer.err(text);
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
      await deps.handlers.today(flags, runtime(deps, options));
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
      await deps.handlers.setup({
        api: deps.apiFactory(options, deps.writer.err),
        configPath: deps.configPath,
        prompts: deps.prompts,
        writer: deps.writer,
        isTTY: deps.isTTY,
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
      const city = pick(
        typeof options.city === "string" ? options.city : undefined,
        root.city,
      );
      const profile = pick(
        typeof options.profile === "string" ? options.profile : undefined,
        root.profile,
      );
      await deps.handlers.config(
        {
          show: options.show === true,
          clear: options.clear === true,
          ...(city === undefined ? {} : { city }),
          ...(profile === undefined ? {} : { profile }),
          ...(typeof options.convention === "string"
            ? { convention: options.convention }
            : {}),
          ...(typeof options.timeFormat === "string"
            ? { timeFormat: options.timeFormat }
            : {}),
        },
        {
          api: deps.apiFactory(root, deps.writer.err),
          configPath: deps.configPath,
          writer: deps.writer,
        },
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
      const city = pick(local.city, root.city);
      const profile = pick(local.profile, root.profile);
      const flags: CalendarFlags = {
        ...(local.month === undefined ? {} : { month: local.month }),
        ...(local.year === undefined ? {} : { year: local.year }),
        ...(city === undefined ? {} : { city }),
        ...(profile === undefined ? {} : { profile }),
        h24: pick(local["24h"], root["24h"]) === true,
        json: pick(local.json, root.json) === true,
        plain: pick(local.plain, root.plain) === true,
      };
      await deps.handlers.calendar(flags, runtime(deps, root));
    });

  return program;
}

export function createApi(
  options: CliOptions,
  env: NodeJS.ProcessEnv,
  warn: Writer["err"],
): HijriApi {
  const offline = options.offline === true;
  const noCache = options.cache === false;
  const now = () => new Date();
  const cache = new FileCache({
    dir: resolveCacheDir(env),
    now,
    warn,
    offline,
    noCache,
  });
  return new HijriApi({
    baseUrl: env.HIJRI_API_BASE_URL ?? DEFAULT_BASE_URL,
    cache,
    fetch: globalThis.fetch,
    warn,
    offline,
  });
}

function runtime(deps: ProgramDeps, options: CliOptions): RuntimeDeps {
  return {
    api: deps.apiFactory(options, deps.writer.err),
    configPath: deps.configPath,
    prompts: deps.prompts,
    writer: deps.writer,
    now: deps.now,
    isTTY: deps.isTTY,
    colorEnabled:
      options.color !== false &&
      deps.stdoutIsTTY &&
      deps.env.NO_COLOR === undefined,
    unicode: supportsUnicode(deps.env),
  };
}

function pick<T>(local: T | undefined, root: T | undefined): T | undefined {
  return local === undefined ? root : local;
}
