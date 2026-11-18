/** Shared configuration loading, onboarding, and flag validation for commands. */

import type { HijriApi } from "../api/client.js";
import {
  DEFAULT_CONFIG,
  loadConfig,
  resolveConfig,
  saveConfig,
} from "../config/config.js";
import type { AppConfig, ConfigOverrides } from "../config/config.js";
import { isProfileId, PROFILE_IDS } from "../domain/profiles.js";
import type { ProfileId } from "../domain/profiles.js";
import type { Convention } from "../domain/types.js";
import { CancelledError, UsageError } from "../errors.js";
import { runOnboarding } from "../onboard/flow.js";
import type { OnboardPrompts } from "../onboard/prompts.js";
import type { Writer } from "../render/writer.js";

export interface SettingsDeps {
  api: Pick<HijriApi, "cities">;
  configPath: string;
  prompts: OnboardPrompts;
  writer: Writer;
  isTTY: boolean;
}

export interface ConventionFlags {
  midnight?: boolean;
  afterMaghrib?: boolean;
}

export async function loadRunSettings(
  overrides: ConfigOverrides,
  deps: SettingsDeps,
): Promise<AppConfig> {
  const { config } = await loadConfig(deps.configPath);
  let saved = config;

  if (saved === undefined) {
    if (deps.isTTY) {
      const cities = await deps.api.cities();
      const result = await runOnboarding(cities, deps.prompts);
      if (result === null) {
        throw new CancelledError();
      }
      saved = {
        ...DEFAULT_CONFIG,
        city: result.city,
        profile: result.profile,
      };
      await saveConfig(deps.configPath, saved);
    } else {
      deps.writer.err(
        'No saved configuration; using Karachi and sunni_hanafi. Run "hijri setup" to choose.\n',
      );
    }
  }

  return resolveConfig(overrides, saved);
}

export function parseProfile(value: string | undefined): ProfileId | undefined {
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

export function parseConvention(flags: ConventionFlags): Convention | undefined {
  if (flags.midnight === true && flags.afterMaghrib === true) {
    throw new UsageError("Use either --midnight or --after-maghrib, not both.");
  }
  if (flags.midnight === true) {
    return "midnight";
  }
  if (flags.afterMaghrib === true) {
    return "after-maghrib";
  }
  return undefined;
}
