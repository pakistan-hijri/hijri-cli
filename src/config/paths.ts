/** XDG-first config and cache directory resolution. */

import { homedir } from "node:os";
import { join } from "node:path";

export interface PathEnv {
  HIJRI_CLI_CONFIG_DIR?: string;
  HIJRI_CLI_CACHE_DIR?: string;
  XDG_CONFIG_HOME?: string;
  XDG_CACHE_HOME?: string;
  HOME?: string;
}

export function resolveConfigDir(env: PathEnv, home = homedir()): string {
  if (env.HIJRI_CLI_CONFIG_DIR !== undefined && env.HIJRI_CLI_CONFIG_DIR !== "") {
    return env.HIJRI_CLI_CONFIG_DIR;
  }
  if (env.XDG_CONFIG_HOME !== undefined && env.XDG_CONFIG_HOME !== "") {
    return join(env.XDG_CONFIG_HOME, "hijri-cli");
  }
  return join(env.HOME ?? home, ".config", "hijri-cli");
}

export function resolveCacheDir(env: PathEnv, home = homedir()): string {
  if (env.HIJRI_CLI_CACHE_DIR !== undefined && env.HIJRI_CLI_CACHE_DIR !== "") {
    return env.HIJRI_CLI_CACHE_DIR;
  }
  if (env.XDG_CACHE_HOME !== undefined && env.XDG_CACHE_HOME !== "") {
    return join(env.XDG_CACHE_HOME, "hijri-cli");
  }
  return join(env.HOME ?? home, ".cache", "hijri-cli");
}

export function resolveConfigPath(env: PathEnv, home = homedir()): string {
  return join(resolveConfigDir(env, home), "config.json");
}
