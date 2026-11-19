#!/usr/bin/env node
/** CLI entry point: flags, command routing, dependency wiring, exit codes. */

import { CommanderError } from "commander";
import { createApi, createProgram } from "./cli-program.js";
import { runCalendar } from "./commands/calendar.js";
import { runConfig } from "./commands/config.js";
import { runSetup } from "./commands/setup.js";
import { runToday } from "./commands/today.js";
import { resolveConfigPath } from "./config/paths.js";
import { toCliError } from "./errors.js";
import { createClackPrompts } from "./onboard/prompts.js";
import { renderJsonError } from "./render/json.js";
import { createWriter } from "./render/writer.js";

async function main(): Promise<void> {
  const writer = createWriter();
  const configPath = resolveConfigPath(process.env);
  const isTTY = Boolean(process.stdin.isTTY && process.stdout.isTTY);
  const program = createProgram({
    writer,
    configPath,
    env: process.env,
    isTTY,
    stdoutIsTTY: Boolean(process.stdout.isTTY),
    prompts: createClackPrompts(),
    now: () => new Date(),
    apiFactory: (options, warn) => createApi(options, process.env, warn),
    handlers: { today: runToday, calendar: runCalendar, config: runConfig, setup: runSetup },
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

void main();
