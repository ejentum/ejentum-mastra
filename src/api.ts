/**
 * Shared HTTP helper for the Ejentum Logic API.
 *
 * Internal module: not part of the public API. Used by the four
 * tool factories in `tools.ts`.
 */

export const DEFAULT_API_URL =
  "https://ejentum-main-ab125c3.zuplo.app/logicv1/";
export const DEFAULT_TIMEOUT_MS = 10_000;

export type HarnessMode =
  | "reasoning"
  | "code"
  | "anti-deception"
  | "memory";

export const VALID_MODES: readonly HarnessMode[] = [
  "reasoning",
  "code",
  "anti-deception",
  "memory",
];

export interface EjentumConfig {
  /**
   * Ejentum Logic API key. If omitted, read from the
   * `EJENTUM_API_KEY` environment variable at call time. Free and
   * paid tiers at https://ejentum.com/pricing.
   */
  apiKey?: string;
  /**
   * Override only if you self-host the Ejentum Logic API gateway.
   */
  apiUrl?: string;
  /**
   * Per-call HTTP timeout in milliseconds. Default 10s.
   */
  timeoutMs?: number;
}

/**
 * POST to the Logic API and return the scaffold string.
 *
 * Returns a human-readable error string for every failure path; the
 * caller (an AI SDK `execute` function) is expected to return this
 * verbatim, which is why nothing here throws.
 */
export async function callLogicApi(
  mode: HarnessMode,
  query: unknown,
  config: EjentumConfig = {},
): Promise<string> {
  const cleanQuery =
    typeof query === "string" ? query.trim() : "";
  if (!cleanQuery) {
    return "Ejentum harness call failed: 'query' is required.";
  }
  if (!VALID_MODES.includes(mode)) {
    return (
      "Ejentum harness call failed: 'mode' must be one of " +
      "reasoning|code|anti-deception|memory, got '" +
      String(mode) +
      "'."
    );
  }

  const resolvedKey =
    config.apiKey ?? process.env.EJENTUM_API_KEY;
  if (!resolvedKey) {
    return (
      "Ejentum harness call failed: EJENTUM_API_KEY environment " +
      "variable is not set. Free and paid tiers at " +
      "https://ejentum.com/pricing."
    );
  }

  const apiUrl = config.apiUrl ?? DEFAULT_API_URL;
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + resolvedKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: cleanQuery, mode }),
      signal: controller.signal,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : String(err);
    return "Ejentum harness call failed: network error: " + message;
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 401) {
    return (
      "Ejentum harness call failed: unauthorized (401). Check the " +
      "EJENTUM_API_KEY value. Free and paid tiers at " +
      "https://ejentum.com/pricing."
    );
  }
  if (response.status !== 200) {
    const body = (await response.text()).slice(0, 300);
    return (
      "Ejentum harness call failed: HTTP " +
      String(response.status) +
      ". Response: " +
      body
    );
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    const body = (await response.text()).slice(0, 300);
    return (
      "Ejentum harness call failed: response is not valid JSON. " +
      "Body: " +
      body
    );
  }

  if (Array.isArray(data) && data.length > 0) {
    const first = data[0];
    if (first && typeof first === "object") {
      const scaffold = (first as Record<string, unknown>)[mode];
      if (typeof scaffold === "string" && scaffold.length > 0) {
        return scaffold;
      }
    }
  }

  return (
    "Ejentum harness call returned an unexpected response shape: " +
    JSON.stringify(data).slice(0, 300)
  );
}
