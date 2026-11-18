/** Bidi isolation and display-width helpers for right-to-left text. */

const RTL_ISOLATE_START = "\u2068";
const RTL_ISOLATE_END = "\u2069";
const ZERO_WIDTH = /\u200c|\u200d|[\u200e\u200f\u202a-\u202e\u2066-\u2069]|\p{M}/gu;

export function rtl(text: string): string {
  return `${RTL_ISOLATE_START}${text}${RTL_ISOLATE_END}`;
}

export function rightAlign(text: string, width: number): string {
  const padding = Math.max(0, width - displayWidth(text));
  return `${" ".repeat(padding)}${text}`;
}

export function displayWidth(text: string): number {
  return [...text.replace(ZERO_WIDTH, "")].length;
}
