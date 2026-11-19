/** Bidi mode selection and display helpers for right-to-left text. */

export type RtlMode = "logical" | "visual";

const LTR_OVERRIDE_START = "\u202d";
const LTR_OVERRIDE_END = "\u202c";
const RTL_ISOLATE_START = "\u2067";
const RTL_ISOLATE_END = "\u2069";
const graphemes = new Intl.Segmenter("ur", { granularity: "grapheme" });
const ZERO_WIDTH = /\u200c|\u200d|[\u200e\u200f\u202a-\u202e\u2066-\u2069]|\p{M}/gu;

export function detectRtlMode(env: NodeJS.ProcessEnv): RtlMode {
  const override = env.HIJRI_CLI_RTL;
  if (override === "logical" || override === "visual") {
    return override;
  }

  if (env.TERM_PROGRAM === "vscode") {
    return "visual";
  }

  const native =
    env.KONSOLE_VERSION !== undefined ||
    env.TERM_PROGRAM?.toLowerCase() === "iterm.app" ||
    env.WT_SESSION !== undefined ||
    env.GNOME_TERMINAL_SCREEN !== undefined ||
    env.KITTY_WINDOW_ID !== undefined;

  return native ? "logical" : "visual";
}

export function visualRtl(text: string, mode: RtlMode = "visual"): string {
  if (mode === "logical") {
    return `${RTL_ISOLATE_START}${text}${RTL_ISOLATE_END}`;
  }

  const reversed = [...graphemes.segment(text)]
    .map((part) => part.segment)
    .reverse()
    .join("");
  return `${LTR_OVERRIDE_START}${reversed}${LTR_OVERRIDE_END}`;
}

export function rightAlign(text: string, width: number): string {
  const padding = Math.max(0, width - displayWidth(text));
  return `${" ".repeat(padding)}${text}`;
}

export function displayWidth(text: string): number {
  return [...text.replace(ZERO_WIDTH, "")].length;
}
