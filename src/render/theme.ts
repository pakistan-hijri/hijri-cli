/** Colour and Unicode capability decisions for terminal output. */

import { createColors } from "picocolors";

export interface Theme {
  bold: (value: string) => string;
  dim: (value: string) => string;
  accent: (value: string) => string;
  warning: (value: string) => string;
  success: (value: string) => string;
}

export function createTheme(enabled: boolean): Theme {
  const colors = createColors(enabled);
  return {
    bold: colors.bold,
    dim: colors.dim,
    accent: colors.cyan,
    warning: colors.yellow,
    success: colors.green,
  };
}

export function supportsUnicode(env: NodeJS.ProcessEnv): boolean {
  if (env.TERM === "dumb") {
    return false;
  }
  const locale = env.LC_ALL ?? env.LC_CTYPE ?? env.LANG ?? "";
  if (/utf-?8/i.test(locale)) {
    return true;
  }
  return locale !== "C" && locale !== "POSIX";
}
