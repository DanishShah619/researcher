import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createRateLimiter } from "@/lib/rateLimit";
import { parseBoundedInt } from "@/lib/params";

// Requests per minute per client on /apis/*. Allows a full minute's worth as a burst,
// which comfortably covers debounced search typing. Override with API_RATE_LIMIT_PER_MINUTE.
const PER_MINUTE = parseBoundedInt(process.env.API_RATE_LIMIT_PER_MINUTE ?? null, 60, 1, 10_000);

const take = createRateLimiter({ capacity: PER_MINUTE, refillPerSecond: PER_MINUTE / 60 });

// Behind a reverse proxy the first X-Forwarded-For entry is normally the original
// client, but a client can send its own value there, so this limits casual abuse
// rather than a determined attacker; use a gateway or WAF for stronger guarantees.
function clientKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

export function proxy(request: NextRequest) {
  const { allowed, retryAfterSeconds } = take(clientKey(request));
  if (allowed) return NextResponse.next();

  return NextResponse.json(
    { error: "Too many requests. Please slow down and try again shortly." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}

export const config = {
  matcher: "/apis/:path*",
};
