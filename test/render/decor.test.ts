import { describe, expect, it } from "vitest";
import {
  CARD_WIDTH,
  badge,
  crescent,
  frame,
  leaders,
  marker,
  section,
  spaced,
  visibleWidth,
} from "../../src/render/decor.js";
import type { DecorStyle } from "../../src/render/decor.js";
import { createTheme } from "../../src/render/theme.js";

const unicode: DecorStyle = { ascii: false, theme: createTheme(false) };
const ascii: DecorStyle = { ascii: true, theme: createTheme(false) };
const styles: DecorStyle[] = [unicode, ascii];

describe("decor primitives", () => {
  it.each(styles)("builds a 40-column frame for ascii=$ascii", (style) => {
    const lines = frame("HIJRI", "Karachi · Friday, 13 November 2026", style);

    expect(lines).toHaveLength(3);
    for (const line of lines) {
      expect(visibleWidth(line)).toBe(CARD_WIDTH);
    }
    expect(lines[1]).toContain("Karachi");
  });

  it.each(styles)("builds a 40-column section for ascii=$ascii", (style) => {
    expect(visibleWidth(section("PRAYERS", style))).toBe(CARD_WIDTH);
    expect(section("PRAYERS", style)).toContain("PRAYERS");
  });

  it("keeps leaders aligned with and without colour", () => {
    const coloured: DecorStyle = { ascii: false, theme: createTheme(true) };
    const line = leaders("Maghrib", "17:45", unicode);
    const colouredLine = leaders("Maghrib", "17:45", coloured);

    expect(visibleWidth(line)).toBe(CARD_WIDTH);
    expect(visibleWidth(colouredLine)).toBe(CARD_WIDTH);
    expect(line).toContain("Maghrib");
  });

  it("uses ASCII substitutes when Unicode is unavailable", () => {
    expect(marker(unicode)).toContain("▸");
    expect(marker(ascii)).toContain(">");
    expect(crescent(unicode)).toContain("☾");
    expect(crescent(ascii)).toContain("(");
    expect(section("NEXT", ascii)).toMatch(/^-{2} NEXT /u);
    expect(section("NEXT", unicode)).toMatch(/^─{2} NEXT /u);
  });

  it("spaces titles and wraps badges", () => {
    expect(spaced("HIJRI")).toBe("H I J R I");
    expect(badge("CONFIRMED", unicode)).toBe("[CONFIRMED]");
  });

  it("truncates an overlong frame subtitle", () => {
    const lines = frame("HIJRI", "x".repeat(80), unicode);

    expect(visibleWidth(lines[1] ?? "")).toBe(CARD_WIDTH);
    expect(lines[1]).toContain("…");
  });
});
