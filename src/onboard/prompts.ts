/** Interactive prompt adapter boundary; tests inject the same interface. */

import { intro, isCancel, outro, select } from "@clack/prompts";
import type { City } from "../domain/types.js";
import type { ProfileId } from "../domain/profiles.js";
import { isProfileId, PROFILE_IDS, PROFILE_LABELS } from "../domain/profiles.js";

export interface OnboardPrompts {
  intro: (message: string) => void;
  outro: (message: string) => void;
  selectCity: (cities: City[]) => Promise<string | null>;
  selectProfile: () => Promise<ProfileId | null>;
}

export function createClackPrompts(): OnboardPrompts {
  return {
    intro,
    outro,
    async selectCity(cities) {
      const result = await select({
        message: "City",
        options: cities.map((city) => ({
          value: city.id,
          label: `${city.name} — ${city.province}`,
        })),
      });
      return isCancel(result) ? null : result;
    },
    async selectProfile() {
      const result = await select({
        message: "Prayer profile",
        initialValue: "sunni_hanafi",
        options: PROFILE_IDS.map((id) => ({
          value: id,
          label: PROFILE_LABELS[id],
        })),
      });
      if (isCancel(result)) {
        return null;
      }
      return isProfileId(result) ? result : null;
    },
  };
}
