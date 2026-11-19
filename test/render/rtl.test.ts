import { describe, expect, it } from "vitest";
import { detectRtlMode, displayWidth, visualRtl } from "../../src/render/rtl.js";

describe("RTL mode detection", () => {
  const rows = [
    { name: "unknown terminal", env: {}, expected: "visual" },
    {
      name: "VS Code uses the visual fallback",
      env: { TERM_PROGRAM: "vscode" },
      expected: "visual",
    },
    {
      name: "Konsole uses native RTL",
      env: { KONSOLE_VERSION: "240401" },
      expected: "logical",
    },
    {
      name: "iTerm uses native RTL",
      env: { TERM_PROGRAM: "iTerm.app" },
      expected: "logical",
    },
    {
      name: "Windows Terminal uses native RTL",
      env: { WT_SESSION: "session" },
      expected: "logical",
    },
    {
      name: "GNOME Terminal uses native RTL",
      env: { GNOME_TERMINAL_SCREEN: "screen" },
      expected: "logical",
    },
    {
      name: "kitty uses native RTL",
      env: { KITTY_WINDOW_ID: "1" },
      expected: "logical",
    },
    {
      name: "explicit visual override wins in Konsole",
      env: { KONSOLE_VERSION: "240401", HIJRI_CLI_RTL: "visual" },
      expected: "visual",
    },
    {
      name: "explicit logical override wins in VS Code",
      env: { TERM_PROGRAM: "vscode", HIJRI_CLI_RTL: "logical" },
      expected: "logical",
    },
    {
      name: "invalid override falls back to detection",
      env: { KONSOLE_VERSION: "240401", HIJRI_CLI_RTL: "bogus" },
      expected: "logical",
    },
  ] as const;

  it.each(rows)("$name", ({ env, expected }) => {
    expect(detectRtlMode(env)).toBe(expected);
  });
});

describe("visualRtl", () => {
  it("reverses graphemes under LRO/PDF in visual mode", () => {
    expect(visualRtl("اب", "visual")).toBe("\u202dبا\u202c");
  });

  it("wraps logical text in RLI/PDI in logical mode", () => {
    expect(visualRtl("اب", "logical")).toBe("\u2067اب\u2069");
  });

  it("ignores bidi controls when measuring width", () => {
    expect(displayWidth(visualRtl("اب", "visual"))).toBe(2);
    expect(displayWidth(visualRtl("اب", "logical"))).toBe(2);
  });
});
