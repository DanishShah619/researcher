/**
 * Maps a database error to a message that is safe to show users. Raw driver
 * messages can include hostnames, ports, config hints and query text, so callers
 * log the original error server-side and return only this.
 */
export function publicDbErrorMessage(err: unknown): string {
  // Read the driver's error code structurally rather than via instanceof, which
  // can miss when bundling loads more than one copy of the driver module
  const code = typeof err === "object" && err !== null ? (err as { code?: unknown }).code : undefined;
  if (code === "ServiceUnavailable") {
    return "The research database is temporarily unreachable. Please try again shortly.";
  }
  return "Something went wrong while querying the research database.";
}
