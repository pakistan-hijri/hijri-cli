/** JSON transport with a bounded timeout and one retry for transient failures. */

import { DataError, NetworkError } from "../errors.js";

export interface HttpDeps {
  fetch: typeof globalThis.fetch;
  timeoutMs?: number;
  retries?: number;
}

export class HttpError extends NetworkError {
  readonly status: number;

  constructor(url: string, status: number, statusText: string) {
    super(
      `Request to ${hostOf(url)} failed with ${status}${
        statusText === "" ? "" : ` ${statusText}`
      }.`,
    );
    this.name = "HttpError";
    this.status = status;
  }
}

export async function fetchJson(
  url: string,
  deps: HttpDeps,
): Promise<unknown> {
  const retries = deps.retries ?? 1;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    let response: Response;
    try {
      response = await request(url, deps);
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        continue;
      }
      throw error;
    }

    if (!response.ok) {
      if (response.status >= 500 && attempt < retries) {
        continue;
      }
      throw new HttpError(url, response.status, response.statusText);
    }

    try {
      return await response.json();
    } catch (error) {
      throw new DataError(
        `Invalid JSON from ${hostOf(url)}. The published data may be mid-update.`,
        error,
      );
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new NetworkError(`Could not reach ${hostOf(url)}.`);
}

async function request(url: string, deps: HttpDeps): Promise<Response> {
  const controller = new AbortController();
  const timeoutMs = deps.timeoutMs ?? 10_000;
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await deps.fetch(url, { signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new NetworkError(
        `Request to ${hostOf(url)} timed out after ${timeoutMs / 1000}s.`,
        error,
      );
    }
    throw new NetworkError(
      `Could not reach ${hostOf(url)}. Check your connection and try again.`,
      error,
    );
  } finally {
    clearTimeout(timer);
  }
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
