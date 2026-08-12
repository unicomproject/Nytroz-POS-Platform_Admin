/** Generates a fresh Idempotency-Key for each bootstrap mutation submission. */
export function createIdempotencyKey(): string {
  return crypto.randomUUID();
}
