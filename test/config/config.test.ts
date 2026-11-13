import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  clearConfig,
  DEFAULT_CONFIG,
  formatConfig,
  loadConfig,
  resolveConfig,
  saveConfig,
} from "../../src/config/config.js";
import {
  resolveCacheDir,
  resolveConfigDir,
  resolveConfigPath,
} from "../../src/config/paths.js";
import { ConfigError } from "../../src/errors.js";
import { tempDir } from "../support.js";

describe("config paths", () => {
  it("prefers explicit overrides", () => {
    expect(
      resolveConfigDir({
        HIJRI_CLI_CONFIG_DIR: "/tmp/custom-config",
        XDG_CONFIG_HOME: "/xdg",
      }),
    ).toBe("/tmp/custom-config");
    expect(
      resolveCacheDir({
        HIJRI_CLI_CACHE_DIR: "/tmp/custom-cache",
        XDG_CACHE_HOME: "/xdg-cache",
      }),
    ).toBe("/tmp/custom-cache");
  });

  it("falls back to XDG then HOME", () => {
    expect(resolveConfigDir({ XDG_CONFIG_HOME: "/xdg" }, "/home/test")).toBe(
      "/xdg/hijri-cli",
    );
    expect(resolveConfigDir({ HOME: "/home/test" }, "/ignored")).toBe(
      "/home/test/.config/hijri-cli",
    );
    expect(resolveCacheDir({ HOME: "/home/test" }, "/ignored")).toBe(
      "/home/test/.cache/hijri-cli",
    );
    expect(resolveConfigPath({ HOME: "/home/test" }, "/ignored")).toBe(
      "/home/test/.config/hijri-cli/config.json",
    );
  });
});

describe("config persistence", () => {
  it("returns undefined for a missing file", async () => {
    const dir = await tempDir();
    const result = await loadConfig(join(dir.path, "config.json"));
    expect(result.config).toBeUndefined();
    await dir.cleanup();
  });

  it("round-trips a saved config", async () => {
    const dir = await tempDir();
    const path = join(dir.path, "nested", "config.json");
    const config = {
      ...DEFAULT_CONFIG,
      city: "lahore",
      profile: "shia_jafari" as const,
      convention: "midnight" as const,
      timeFormat: "24h" as const,
    };
    await saveConfig(path, config);
    expect((await loadConfig(path)).config).toEqual(config);
    expect(JSON.parse(await readFile(path, "utf8"))).toEqual(config);
    await dir.cleanup();
  });

  it("reports invalid JSON with the file path", async () => {
    const dir = await tempDir();
    const path = join(dir.path, "config.json");
    await writeFile(path, "{not json");
    await expect(loadConfig(path)).rejects.toBeInstanceOf(ConfigError);
    await expect(loadConfig(path)).rejects.toThrow(path);
    await dir.cleanup();
  });

  it("reports a schema mismatch", async () => {
    const dir = await tempDir();
    const path = join(dir.path, "config.json");
    await writeFile(path, JSON.stringify({ version: 1, city: 42 }));
    await expect(loadConfig(path)).rejects.toBeInstanceOf(ConfigError);
    await dir.cleanup();
  });

  it("clears an existing file and ignores a missing one", async () => {
    const dir = await tempDir();
    const path = join(dir.path, "config.json");
    await saveConfig(path, DEFAULT_CONFIG);
    await clearConfig(path);
    await expect(loadConfig(path)).resolves.toMatchObject({ config: undefined });
    await expect(clearConfig(path)).resolves.toBeUndefined();
    await dir.cleanup();
  });
});

describe("resolveConfig", () => {
  it("uses flag, saved, then default precedence per field", () => {
    const saved = {
      ...DEFAULT_CONFIG,
      city: "lahore",
      profile: "sunni_asr1" as const,
    };
    expect(resolveConfig({ city: "quetta" }, saved)).toEqual({
      ...saved,
      city: "quetta",
    });
    expect(resolveConfig({}, undefined)).toEqual(DEFAULT_CONFIG);
  });
});

describe("formatConfig", () => {
  it("prints the source", () => {
    expect(formatConfig(DEFAULT_CONFIG, "defaults")).toContain(
      "source: defaults",
    );
  });
});
