import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FileCache } from "../../src/api/cache.js";
import { cacheKey } from "../../src/api/cache-key.js";
import { tempDir } from "../support.js";

describe("cacheKey", () => {
  it("never contains path separators", () => {
    const key = cacheKey("https://example.test/prayer/karachi/sunni_hanafi/2026.json");
    expect(key).toMatch(/^[a-f0-9]{64}\.json$/);
    expect(key).not.toContain("/");
  });
});

describe("FileCache", () => {
  it("returns fresh data within the TTL", async () => {
    const dir = await tempDir();
    let now = new Date("2026-11-13T00:00:00.000Z");
    const cache = new FileCache({
      dir: dir.path,
      now: () => now,
      warn: () => undefined,
    });

    await cache.set("https://example.test/data.json", { value: 1 });
    const fresh = await cache.getFresh(
      "https://example.test/data.json",
      60_000,
    );
    expect(fresh?.body).toEqual({ value: 1 });

    now = new Date("2026-11-13T00:02:00.000Z");
    expect(
      await cache.getFresh("https://example.test/data.json", 60_000),
    ).toBeUndefined();
    expect(
      (await cache.getStale("https://example.test/data.json"))?.body,
    ).toEqual({ value: 1 });
    await dir.cleanup();
  });

  it("uses one URL-keyed envelope", async () => {
    const dir = await tempDir();
    const cache = new FileCache({
      dir: dir.path,
      now: () => new Date("2026-11-13T00:00:00.000Z"),
      warn: () => undefined,
    });
    const url = "https://example.test/data.json";
    await cache.set(url, { ok: true });

    const raw = JSON.parse(
      await readFile(join(dir.path, cacheKey(url)), "utf8"),
    ) as {
      url: string;
      fetchedAt: string;
      body: unknown;
    };
    expect(raw.url).toBe(url);
    expect(raw.fetchedAt).toBe("2026-11-13T00:00:00.000Z");
    expect(raw.body).toEqual({ ok: true });
    await dir.cleanup();
  });

  it("treats corrupt envelopes as misses", async () => {
    const dir = await tempDir();
    const url = "https://example.test/data.json";
    await writeFile(join(dir.path, cacheKey(url)), "{not json");
    const cache = new FileCache({
      dir: dir.path,
      now: () => new Date("2026-11-13T00:00:00.000Z"),
      warn: () => undefined,
    });
    expect(await cache.getFresh(url, 60_000)).toBeUndefined();
    expect(await cache.getStale(url)).toBeUndefined();
    await dir.cleanup();
  });

  it("bypasses reads and writes with noCache", async () => {
    const dir = await tempDir();
    const cache = new FileCache({
      dir: dir.path,
      now: () => new Date("2026-11-13T00:00:00.000Z"),
      warn: () => undefined,
      noCache: true,
    });
    const url = "https://example.test/data.json";
    await cache.set(url, { ok: true });
    expect(await cache.getFresh(url, 60_000)).toBeUndefined();
    expect(await cache.getStale(url)).toBeUndefined();
    await dir.cleanup();
  });

  it("does not write in offline mode", async () => {
    const dir = await tempDir();
    const cache = new FileCache({
      dir: dir.path,
      now: () => new Date("2026-11-13T00:00:00.000Z"),
      warn: () => undefined,
      offline: true,
    });
    const url = "https://example.test/data.json";
    await cache.set(url, { ok: true });
    expect(await cache.getStale(url)).toBeUndefined();
    await dir.cleanup();
  });
});
