/**
 * Circuit breaker simplu pentru WordPress bootstrap.
 * Dacă WP nu răspunde în timeout → fallback la guest mode.
 */

const WP_TIMEOUT_MS = 5000; // 5 secunde

export type CircuitBreakerResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "timeout" | "error"; message: string };

export async function withCircuitBreaker<T>(
  fn: () => Promise<T>
): Promise<CircuitBreakerResult<T>> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("timeout")), WP_TIMEOUT_MS)
  );

  try {
    const data = await Promise.race([fn(), timeout]);
    return { ok: true, data };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    if (message === "timeout") {
      return { ok: false, reason: "timeout", message: "WordPress nu răspunde" };
    }

    return { ok: false, reason: "error", message };
  }
}