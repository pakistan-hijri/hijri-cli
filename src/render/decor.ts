/** Reusable terminal decoration primitives for the human card renderers. */

import { displayWidth } from "./rtl.js";
import type { Theme } from "./theme.js";

export const CARD_WIDTH = 40;

const ESCAPE = String.fromCharCode(27);
const ANSI = new RegExp(`${ESCAPE}\\[[0-9;]*m`, "gu");

export interface DecorStyle {
  ascii: boolean;
  theme: Theme;
}

export function spaced(text: string): string {
  return [...text].join(" ");
}

export function frame(
  title: string,
  subtitle: string,
  style: DecorStyle,
): string[] {
  const corner = style.ascii ? ["+", "+", "+", "+"] : ["╭", "╮", "╰", "╯"];
  const horizontal = style.ascii ? "-" : "─";
  const vertical = style.ascii ? "|" : "│";
  const label = spaced(title);
  const topLabel = ` ${label} `;
  const topFill = Math.max(
    0,
    CARD_WIDTH - visibleWidth(topLabel) - 3,
  );
  const body = ` ${truncate(subtitle, CARD_WIDTH - 4)} `;
  return [
    `${corner[0] ?? ""}${horizontal}${topLabel}${horizontal.repeat(topFill)}${corner[1] ?? ""}`,
    `${vertical ?? ""}${body}${" ".repeat(Math.max(0, CARD_WIDTH - visibleWidth(body) - 2))}${vertical ?? ""}`,
    `${corner[2] ?? ""}${horizontal.repeat(CARD_WIDTH - 2)}${corner[3] ?? ""}`,
  ];
}

export function section(label: string, style: DecorStyle): string {
  const horizontal = style.ascii ? "-" : "─";
  const text = ` ${label} `;
  const remainder = Math.max(0, CARD_WIDTH - visibleWidth(text) - 2);
  return `${horizontal}${horizontal}${text}${horizontal.repeat(remainder)}`;
}

export function badge(text: string, style: DecorStyle): string {
  return style.theme.bold(`[${text}]`);
}

export function marker(style: DecorStyle): string {
  return style.theme.accent(style.ascii ? ">" : "▸");
}

export function crescent(style: DecorStyle): string {
  return style.theme.accent(style.ascii ? "(" : "☾");
}

export function leaders(
  label: string,
  value: string,
  style: DecorStyle,
): string {
  const dot = style.ascii ? "." : "·";
  const fixed = 2 + visibleWidth(label) + 2 + visibleWidth(value);
  const count = Math.max(1, CARD_WIDTH - fixed);
  return `  ${label} ${dot.repeat(count)} ${value}`;
}

export function visibleWidth(text: string): number {
  return displayWidth(text.replace(ANSI, ""));
}

function truncate(text: string, width: number): string {
  if (visibleWidth(text) <= width) {
    return text;
  }
  const ellipsis = width > 1 ? "…" : "";
  return `${[...text].slice(0, Math.max(0, width - 1)).join("")}${ellipsis}`;
}
