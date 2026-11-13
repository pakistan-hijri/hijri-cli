/** Shared onboarding flow: choose a city and profile, persist nothing. */

import type { City } from "../domain/types.js";
import type { ProfileId } from "../domain/profiles.js";
import { isProfileId } from "../domain/profiles.js";
import type { OnboardPrompts } from "./prompts.js";

export interface OnboardResult {
  city: string;
  profile: ProfileId;
}

export async function runOnboarding(
  cities: City[],
  prompts: OnboardPrompts,
): Promise<OnboardResult | null> {
  prompts.intro("hijri-cli");
  const city = await prompts.selectCity(cities);
  if (city === null) {
    return null;
  }
  const profile = await prompts.selectProfile();
  if (profile === null || !isProfileId(profile)) {
    return null;
  }
  prompts.outro("Setup complete.");
  return { city, profile };
}
