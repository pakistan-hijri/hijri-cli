/** Prayer profile ids and labels from the published hijri-api contract. */

export const PROFILE_IDS = [
  "sunni_hanafi",
  "sunni_asr1",
  "shia_jafari",
] as const;

export type ProfileId = (typeof PROFILE_IDS)[number];

export const PROFILE_LABELS: Record<ProfileId, string> = {
  sunni_hanafi: "Sunni (Hanafi)",
  sunni_asr1: "Sunni (earlier Asr)",
  shia_jafari: "Shia (Jafari)",
};

export function isProfileId(value: string): value is ProfileId {
  return (PROFILE_IDS as readonly string[]).includes(value);
}
