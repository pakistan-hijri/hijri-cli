/** Bidi isolation and display-width helpers for right-to-left text. */

const LTR_OVERRIDE_START = "\u202d";
const LTR_OVERRIDE_END = "\u202c";
const graphemes = new Intl.Segmenter("ur", { granularity: "grapheme" });
const ZERO_WIDTH = /\u200c|\u200d|[\u200e\u200f\u202a-\u202e\u2066-\u2069]|\p{M}/gu;

export function visualRtl(text: string): string {
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
