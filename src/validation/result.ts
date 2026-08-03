// Shared result type for all validators.

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] };

/** True for a plain JSON object — rejects null and arrays, which are also `typeof "object"`. */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A string with at least one non-whitespace character. */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
