/** `hijri setup`: interactive city/profile selection and persistence. */

import { loadConfig, resolveConfig, saveConfig } from "../config/config.js";
import { UsageError, CancelledError } from "../errors.js";
import { PROFILE_LABELS } from "../domain/profiles.js";
import type { HijriApi } from "../api/client.js";
import type { Writer } from "../render/writer.js";
import type { OnboardPrompts } from "../onboard/prompts.js";
import { runOnboarding } from "../onboard/flow.js";

export interface SetupDeps {
  api: Pick<HijriApi, "cities">;
  configPath: string;
  prompts: OnboardPrompts;
  writer: Writer;
  isTTY: boolean;
}

export async function runSetup(deps: SetupDeps): Promise<void> {
  if (!deps.isTTY) {
    throw new UsageError(
      "hijri setup needs an interactive terminal. Use \"hijri config --city\" and \"hijri config --profile\" instead.",
    );
  }

  const cities = await deps.api.cities();
  const result = await runOnboarding(cities, deps.prompts);
  if (result === null) {
    throw new CancelledError();
  }

  const saved = await loadConfig(deps.configPath);
  const config = resolveConfig(
    { city: result.city, profile: result.profile },
    saved.config,
  );
  await saveConfig(deps.configPath, config);
  const city = cities.find((candidate) => candidate.id === result.city);
  deps.writer.out(
    `Saved: ${city?.name ?? result.city} (${PROFILE_LABELS[config.profile]}).\n`,
  );
}
