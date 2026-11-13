/** Stable, filesystem-safe cache filenames derived from a full URL. */

import { createHash } from "node:crypto";

export function cacheKey(url: string): string {
  return `${createHash("sha256").update(url).digest("hex")}.json`;
}
