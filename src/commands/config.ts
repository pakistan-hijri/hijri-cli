/** `hijri config`: show, update, or clear saved settings. */

import {
  clearConfig,
  formatConfig,
  loadConfig,
  resolveConfig,
  saveConfig,
  DEFAULT_CONFIG,
} from "../config/config.js";
import { UsageError } from "../errors.js";
import { isProfileId, PROFILE_IDS } from "../domain/profiles.js";
import type { ProfileId } from "../domain/profiles.js";
import type { Convention, TimeFormat } from "../domain/types.js";
import type { HijriApi } from "../api/client.js";
import type { Writer } from "../render/writer.js";

export interface ConfigFlags {
  show?: boolean;
  clear?: boolean;
  city?: string;
  profile?: string;
  convention?: string;
  timeFormat?: string;
}

export interface ConfigDeps {
  api: Pick<HijriApi, "requireCity">;
  configPath: string;
  writer: Writer;
}

export async function runConfig(
  flags: ConfigFlags,
  deps: ConfigDeps,
): Promise<void> {
  const hasSetter =
    flags.city !== undefined ||
    flags.profile !== undefined ||
    flags.convention !== undefined ||
    flags.timeFormat !== undefined;

  if (flags.clear === true && (hasSetter || flags.show === true)) {
    throw new UsageError(
      "--clear cannot be combined with --show or configuration values.",
    );
  }

  if (flags.clear === true) {
    await clearConfig(deps.configPath);
    deps.writer.out("Configuration cleared.\n");
    return;
  }

  const loaded = await loadConfig(deps.configPath);

  if (!hasSetter) {
    const config = loaded.config ?? DEFAULT_CONFIG;
    deps.writer.out(
      `${formatConfig(config, loaded.config === undefined ? "defaults" : "saved")}\n`,
    );
    return;
  }

  const profile = parseProfile(flags.profile);
  const convention = parseConvention(flags.convention);
  const timeFormat = parseTimeFormat(flags.timeFormat);

  if (flags.city !== undefined) {
    await deps.api.requireCity(flags.city);
  }

  const config = resolveConfig(
    {
      ...(flags.city === undefined ? {} : { city: flags.city }),
      ...(profile === undefined ? {} : { profile }),
      ...(convention === undefined ? {} : { convention }),
      ...(timeFormat === undefined ? {} : { timeFormat }),
    },
    loaded.config,
  );
  await saveConfig(deps.configPath, config);
  deps.writer.out(`${formatConfig(config, "saved")}\n`);
}

function parseProfile(value: string | undefined): ProfileId | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!isProfileId(value)) {
    throw new UsageError(
      `Unknown profile "${value}". Accepted profiles: ${PROFILE_IDS.join(", ")}.`,
    );
  }
  return value;
}

function parseConvention(value: string | undefined): Convention | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value !== "after-maghrib" && value !== "midnight") {
    throw new UsageError(
      `Unknown convention "${value}". Accepted conventions: after-maghrib, midnight.`,
    );
  }
  return value;
}

function parseTimeFormat(value: string | undefined): TimeFormat | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value !== "12h" && value !== "24h") {
    throw new UsageError(
      `Unknown time format "${value}". Accepted formats: 12h, 24h.`,
    );
  }
  return value;
}
