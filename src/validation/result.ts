// Shared result type for all validators.
//
// Validators return this instead of throwing, for the same reason repositories
// return null instead of throwing: the caller decides what an invalid request
// means. Here the route turns { ok: false } into a 400 with the error list.
//
// It's a discriminated union on `ok`, so checking `if (result.ok)` narrows the
// type — inside that branch TypeScript knows `value` exists, and in the else
// branch it knows `errors` does.

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
