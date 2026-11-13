/** Saved configuration: schema, precedence, and atomic persistence. */

import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { z } from "zod";
import { ConfigError } from "../errors.js";
import { PROFILE_IDS } from "../domain/profiles.js";
import type { ProfileId } from "../domain/profiles.js";
import type { Convention, TimeFormat } from "../domain/types.js";

export interface AppConfig {
  version: 1;
  city: string;
  profile: ProfileId;
  convention: Convention;
  timeFormat: TimeFormat;
}

export const DEFAULT_CONFIG: AppConfig = {
  version: 1,
  city: "karachi",
  profile: "sunni_hanafi",
  convention: "after-maghrib",
  timeFormat: "12h",
};

const configSchema = z.object({
  version: z.literal(1),
  city: z.string().min(1),
  profile: z.enum(PROFILE_IDS),
  convention: z.enum(["after-maghrib", "midnight"]),
  timeFormat: z.enum(["12h", "24h"]),
});

export interface ConfigLoadResult {
  config: AppConfig | undefined;
  path: string;
}

export async function loadConfig(path: string): Promise<ConfigLoadResult> {
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch (error) {
    if (isMissing(error)) {
      return { config: undefined, path };
    }
    throw new ConfigError(`Could not read config at ${path}.`, error);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (error) {
    throw new ConfigError(
      `Config at ${path} is not valid JSON. Run "hijri config --clear" to reset it.`,
      error,
    );
  }

  const result = configSchema.safeParse(parsed);
  if (!result.success) {
    throw new ConfigError(
      `Config at ${path} is invalid. Run "hijri config --clear" to reset it.`,
      result.error,
    );
  }
  return { config: result.data, path };
}

export async function saveConfig(path: string, config: AppConfig): Promise<void> {
  const temp = `${path}.${randomUUID()}.tmp`;
  try {
    await mkdir(dirname(path), { recursive: true, mode: 0o700 });
    await writeFile(temp, `${JSON.stringify(config, null, 2)}\n`, {
      mode: 0o600,
    });
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
    throw new ConfigError(`Could not save config at ${path}.`, error);
  }
}

export async function clearConfig(path: string): Promise<void> {
  try {
    await unlink(path);
  } catch (error) {
    if (!isMissing(error)) {
      throw new ConfigError(`Could not clear config at ${path}.`, error);
    }
  }
}

export interface ConfigOverrides {
  city?: string;
  profile?: ProfileId;
  convention?: Convention;
  timeFormat?: TimeFormat;
}

export function resolveConfig(
  overrides: ConfigOverrides,
  saved: AppConfig | undefined,
): AppConfig {
  const base = saved ?? DEFAULT_CONFIG;
  return {
    version: 1,
    city: overrides.city ?? base.city,
    profile: overrides.profile ?? base.profile,
    convention: overrides.convention ?? base.convention,
    timeFormat: overrides.timeFormat ?? base.timeFormat,
  };
}

export function formatConfig(config: AppConfig, source: "saved" | "defaults"): string {
  return [
    `version: ${config.version}`,
    `city: ${config.city}`,
    `profile: ${config.profile}`,
    `convention: ${config.convention}`,
    `time-format: ${config.timeFormat}`,
    `source: ${source}`,
  ].join("\n");
}

function isMissing(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error.code === "ENOENT" || error.code === "ENOTDIR")
  );
}

function isReplaceError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error.code === "EEXIST" || error.code === "EPERM")
  );
}
