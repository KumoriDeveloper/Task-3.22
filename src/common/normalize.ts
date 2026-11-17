/** Trims an optional user supplied string, turning empty values into NULL. */
export function nullable(value: string | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Patch semantics for nullable columns: `undefined` leaves the value untouched,
 * an empty string clears it to NULL. Prisma understands both values natively.
 */
export function nullablePatch(value: string | null | undefined): string | null | undefined {
  return value === undefined ? undefined : nullable(value);
}

/** Trims, drops empty entries and de-duplicates a list of strings. */
export function stringList(values: readonly string[] | null | undefined): string[] {
  if (!values) {
    return [];
  }

  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of values) {
    const value = raw.trim();
    if (!value || seen.has(value)) {
      continue;
    }

    seen.add(value);
    result.push(value);
  }

  return result;
}

/**
 * Truncates a timestamp to UTC midnight.
 * The database columns are DATE, so the time part must not leak into them.
 */
export function dateOnly(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}
