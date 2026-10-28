/**
 * Parses an integer query parameter and clamps it to [min, max].
 * Missing or non-numeric input falls back to `fallback`, so a caller can never
 * send NaN or an unbounded value into a Cypher LIMIT or traversal depth.
 */
export function parseBoundedInt(
  raw: string | null,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  const value = Number.isNaN(parsed) ? fallback : parsed;
  return Math.min(Math.max(value, min), max);
}

// Largest page size any public route will return in one request.
export const MAX_LIMIT = 100;
