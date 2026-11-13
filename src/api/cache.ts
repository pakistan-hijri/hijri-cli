/** URL-keyed JSON cache with TTLs, stale reads, and atomic writes. */

import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { cacheKey } from "./cache-key.js";

const envelopeSchema = z.object({
  url: z.string(),
  fetchedAt: z.string(),
  body: z.unknown(),
});

export interface CachedEntry {
  body: unknown;
  fetchedAt: string;
}

export interface CacheDeps {
  dir: string;
  now: () => Date;
  warn: (message: string) => void;
  noCache?: boolean;
  offline?: boolean;
}

export class FileCache {
  readonly #dir: string;
  readonly #now: () => Date;
  readonly #warn: (message: string) => void;
  readonly #noCache: boolean;
  readonly #offline: boolean;

  constructor(deps: CacheDeps) {
    this.#dir = deps.dir;
    this.#now = deps.now;
    this.#warn = deps.warn;
    this.#noCache = deps.noCache ?? false;
    this.#offline = deps.offline ?? false;
  }

  async getFresh(
    url: string,
    ttlMs: number,
  ): Promise<CachedEntry | undefined> {
    if (this.#noCache) {
      return undefined;
    }
    const entry = await this.#read(url);
    if (entry === undefined) {
      return undefined;
    }
    const age = this.#now().getTime() - new Date(entry.fetchedAt).getTime();
    if (Number.isNaN(age) || age < 0 || age > ttlMs) {
      return undefined;
    }
    return entry;
  }

  async getStale(url: string): Promise<CachedEntry | undefined> {
    if (this.#noCache) {
      return undefined;
    }
    return this.#read(url);
  }

  async set(url: string, body: unknown): Promise<void> {
    if (this.#noCache || this.#offline) {
      return;
    }

    const path = join(this.#dir, cacheKey(url));
    const temp = join(this.#dir, `${cacheKey(url)}.${randomUUID()}.tmp`);
    const envelope = {
      url,
      fetchedAt: this.#now().toISOString(),
      body,
    };

    try {
      await mkdir(this.#dir, { recursive: true, mode: 0o700 });
      await writeFile(temp, `${JSON.stringify(envelope)}\n`, { mode: 0o600 });
      try {
        await rename(temp, path);
      } catch (error) {
        if (!isReplaceError(error)) {
          throw error;
        }
        await unlink(path).catch(() => undefined);
        await rename(temp, path);
      }
    } catch (error) {
      await unlink(temp).catch(() => undefined);
      this.#warn(
        `Could not write the cache: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async #read(url: string): Promise<CachedEntry | undefined> {
    try {
      const raw = await readFile(join(this.#dir, cacheKey(url)), "utf8");
      const parsed = envelopeSchema.safeParse(JSON.parse(raw) as unknown);
      if (!parsed.success || parsed.data.url !== url) {
        return undefined;
      }
      return { body: parsed.data.body, fetchedAt: parsed.data.fetchedAt };
    } catch {
      return undefined;
    }
  }
}

function isReplaceError(error: unknown): boolean {
  if (!(error instanceof Error) || !("code" in error)) {
    return false;
  }
  return error.code === "EEXIST" || error.code === "EPERM";
}
