import { CommanderError } from "commander";
import { describe, expect, it, vi } from "vitest";
import type { HijriApi } from "../../src/api/client.js";
import { createProgram } from "../../src/cli-program.js";
import type { ProgramDeps } from "../../src/cli-program.js";
import type { OnboardPrompts } from "../../src/onboard/prompts.js";
import { VERSION } from "../../src/version.js";
import { capturingWriter } from "../support.js";

const api = {} as HijriApi;

const prompts: OnboardPrompts = {
  intro: () => undefined,
  outro: () => undefined,
  selectCity: () => Promise.resolve(null),
  selectProfile: () => Promise.resolve(null),
};

interface Harness {
  writer: ReturnType<typeof capturingWriter>;
  today: ReturnType<typeof vi.fn>;
  calendar: ReturnType<typeof vi.fn>;
  config: ReturnType<typeof vi.fn>;
  setup: ReturnType<typeof vi.fn>;
  apiFactory: ReturnType<typeof vi.fn>;
  error: unknown;
}

async function parse(
  args: string[],
  options: {
    env?: NodeJS.ProcessEnv;
    stdoutIsTTY?: boolean;
  } = {},
): Promise<Harness> {
  const harness: Omit<Harness, "error"> = {
    writer: capturingWriter(),
    today: vi.fn(() => Promise.resolve()),
    calendar: vi.fn(() => Promise.resolve()),
    config: vi.fn(() => Promise.resolve()),
    setup: vi.fn(() => Promise.resolve()),
    apiFactory: vi.fn(() => api),
  };
  const deps: ProgramDeps = {
    writer: harness.writer,
    configPath: "/tmp/hijri-cli-flags-test/config.json",
    env: { LANG: "C.UTF-8", ...options.env },
    isTTY: false,
    stdoutIsTTY: options.stdoutIsTTY ?? false,
    prompts,
    now: () => new Date("2026-11-13T07:00:00.000Z"),
    apiFactory: harness.apiFactory as ProgramDeps["apiFactory"],
    handlers: {
      today: harness.today as ProgramDeps["handlers"]["today"],
      calendar: harness.calendar as ProgramDeps["handlers"]["calendar"],
      config: harness.config as ProgramDeps["handlers"]["config"],
      setup: harness.setup as ProgramDeps["handlers"]["setup"],
    },
  };
  const program = createProgram(deps);
  let error: unknown;
  try {
    await program.parseAsync(["node", "hijri", ...args], { from: "node" });
  } catch (caught) {
    error = caught;
  }
  return { ...harness, error };
}

function firstCall(spy: ReturnType<typeof vi.fn>): { flags: unknown; deps: unknown } {
  const call = spy.mock.calls[0];
  if (call === undefined) {
    throw new Error("Expected handler to be called.");
  }
  return { flags: call[0] as unknown, deps: call[1] as unknown };
}

function firstArg(spy: ReturnType<typeof vi.fn>): unknown {
  const call = spy.mock.calls[0];
  if (call === undefined) {
    throw new Error("Expected handler to be called.");
  }
  return call[0] as unknown;
}

describe("cli flag parsing", () => {
  it("passes every today flag to runToday", async () => {
    const result = await parse([
      "--city",
      "lahore",
      "--profile",
      "shia_jafari",
      "--date",
      "2026-03-01",
      "--midnight",
      "--24h",
      "--json",
      "--plain",
    ]);

    expect(result.error).toBeUndefined();
    expect(result.today).toHaveBeenCalledTimes(1);
    expect(firstCall(result.today).flags).toEqual({
      city: "lahore",
      profile: "shia_jafari",
      date: "2026-03-01",
      midnight: true,
      afterMaghrib: false,
      h24: true,
      json: true,
      plain: true,
    });
  });

  it("passes --after-maghrib and one-off flags without persisting them", async () => {
    const result = await parse([
      "--after-maghrib",
      "--city",
      "karachi",
      "--offline",
      "--no-cache",
    ]);

    expect(firstCall(result.today).flags).toMatchObject({
      afterMaghrib: true,
      midnight: false,
      city: "karachi",
    });
    expect(result.apiFactory).toHaveBeenCalledWith(
      expect.objectContaining({ offline: true, cache: false }),
      expect.any(Function),
    );
  });

  it.each([
    {
      label: "root flags before the subcommand",
      args: ["--24h", "--city", "lahore", "calendar", "--month", "9", "--year", "1448"],
    },
    {
      label: "root flags after the subcommand",
      args: ["calendar", "--month", "9", "--year", "1448", "--24h", "--city", "lahore"],
    },
  ])("merges $label", async ({ args }) => {
    const result = await parse(args);

    expect(result.calendar).toHaveBeenCalledTimes(1);
    expect(firstCall(result.calendar).flags).toEqual({
      month: "9",
      year: "1448",
      city: "lahore",
      h24: true,
      json: false,
      plain: false,
    });
  });

  it("prefers a command flag over the same root flag", async () => {
    const result = await parse([
      "--city",
      "karachi",
      "--24h",
      "calendar",
      "--city",
      "lahore",
      "--json",
      "--plain",
    ]);

    expect(firstCall(result.calendar).flags).toMatchObject({
      city: "lahore",
      h24: true,
      json: true,
      plain: true,
    });
  });

  it("keeps --json and --plain independent until the command chooses", async () => {
    const result = await parse(["calendar", "--json", "--plain"]);

    expect(firstCall(result.calendar).flags).toMatchObject({
      json: true,
      plain: true,
    });
  });

  it("maps config flags and calls runConfig", async () => {
    const result = await parse([
      "config",
      "--city",
      "peshawar",
      "--profile",
      "sunni_asr1",
      "--convention",
      "midnight",
      "--time-format",
      "24h",
    ]);

    expect(firstCall(result.config).flags).toEqual({
      show: false,
      clear: false,
      city: "peshawar",
      profile: "sunni_asr1",
      convention: "midnight",
      timeFormat: "24h",
    });
  });

  it("maps config clear and show flags", async () => {
    const result = await parse(["config", "--show"]);
    expect(firstCall(result.config).flags).toEqual({
      show: true,
      clear: false,
    });

    const cleared = await parse(["config", "--clear"]);
    expect(firstCall(cleared.config).flags).toEqual({
      show: false,
      clear: true,
    });
  });

  it("calls setup with TTY and prompt dependencies", async () => {
    const result = await parse(["setup"]);

    expect(result.setup).toHaveBeenCalledTimes(1);
    expect(firstArg(result.setup)).toMatchObject({
      configPath: "/tmp/hijri-cli-flags-test/config.json",
      prompts,
      isTTY: false,
    });
  });

  it("disables colour for --no-color and NO_COLOR", async () => {
    const flag = await parse(["--no-color"], { stdoutIsTTY: true });
    expect(firstCall(flag.today).deps).toMatchObject({
      colorEnabled: false,
      unicode: true,
    });

    const env = await parse([], {
      stdoutIsTTY: true,
      env: { NO_COLOR: "1" },
    });
    expect(firstCall(env.today).deps).toMatchObject({ colorEnabled: false });
  });

  it("enables colour only on a TTY", async () => {
    const tty = await parse([], { stdoutIsTTY: true });
    const pipe = await parse([]);

    expect(firstCall(tty.today).deps).toMatchObject({ colorEnabled: true });
    expect(firstCall(pipe.today).deps).toMatchObject({ colorEnabled: false });
  });

  it("uses the ASCII renderer when the terminal lacks Unicode", async () => {
    const result = await parse([], { env: { TERM: "dumb" } });

    expect(firstCall(result.today).deps).toMatchObject({ unicode: false });
  });

  it("prints help and version without calling a handler", async () => {
    const help = await parse(["--help"]);
    expect(help.error).toBeInstanceOf(CommanderError);
    expect(help.writer.stdout).toContain("show a Hijri month calendar");
    expect(help.today).not.toHaveBeenCalled();

    const version = await parse(["--version"]);
    expect(version.writer.stdout).toContain(VERSION);
    expect(version.today).not.toHaveBeenCalled();
  });

  it("rejects an unknown flag", async () => {
    const result = await parse(["--bogus"]);

    expect(result.error).toBeInstanceOf(CommanderError);
    expect(result.today).not.toHaveBeenCalled();
  });
});
