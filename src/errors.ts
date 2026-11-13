/** Stable error types and exit-code mapping for every CLI layer. */

export type ErrorCode =
  | "usage"
  | "config"
  | "network"
  | "data_unavailable"
  | "out_of_range"
  | "cancelled"
  | "unexpected";

const EXIT_CODES: Record<ErrorCode, number> = {
  usage: 2,
  config: 2,
  network: 3,
  data_unavailable: 3,
  out_of_range: 4,
  cancelled: 1,
  unexpected: 1,
};

export class CliError extends Error {
  readonly code: ErrorCode;
  readonly exitCode: number;

  constructor(code: ErrorCode, message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "CliError";
    this.code = code;
    this.exitCode = EXIT_CODES[code];
  }
}

export class UsageError extends CliError {
  constructor(message: string, cause?: unknown) {
    super("usage", message, cause);
    this.name = "UsageError";
  }
}

export class ConfigError extends CliError {
  constructor(message: string, cause?: unknown) {
    super("config", message, cause);
    this.name = "ConfigError";
  }
}

export class NetworkError extends CliError {
  constructor(message: string, cause?: unknown) {
    super("network", message, cause);
    this.name = "NetworkError";
  }
}

export class DataError extends CliError {
  constructor(message: string, cause?: unknown) {
    super("data_unavailable", message, cause);
    this.name = "DataError";
  }
}

export class DataUnavailableError extends CliError {
  constructor(message: string, cause?: unknown) {
    super("data_unavailable", message, cause);
    this.name = "DataUnavailableError";
  }
}

export class OutOfRangeError extends CliError {
  constructor(message: string, cause?: unknown) {
    super("out_of_range", message, cause);
    this.name = "OutOfRangeError";
  }
}

export class CancelledError extends CliError {
  constructor(message = "Setup cancelled.") {
    super("cancelled", message);
    this.name = "CancelledError";
  }
}

export function toCliError(error: unknown): CliError {
  if (error instanceof CliError) {
    return error;
  }
  if (error instanceof Error) {
    return new CliError("unexpected", error.message, error);
  }
  return new CliError("unexpected", String(error));
}
