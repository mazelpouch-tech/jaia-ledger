import { NextRequest, NextResponse } from "next/server";

// Must match src/lib/auth.ts. In production the secret MUST come from the
// environment; there is no public fallback, so an unset secret fails closed
// (every protected request is rejected) instead of trusting a guessable key.
const AUTH_SECRET =
  process.env.AUTH_SECRET ||
  (process.env.NODE_ENV === "production" ? "" : "jaia-ledger-dev-only-secret");
const SESSION_COOKIE = "jaia-session";
const SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

// Public routes that don't require auth
const PUBLIC_PATHS = ["/api/auth/login", "/api/auth/logout", "/api/auth/me", "/api/auth/setup-check"];

function hex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Full HMAC verification, edge-runtime compatible via Web Crypto. This produces
// the same digest as the Node `crypto.createHmac("sha256", ...)` used to sign
// the token in src/lib/auth.ts, so a forged cookie with only the right shape is
// rejected here rather than reaching the data API routes.
async function verifyTokenEdge(token: string): Promise<boolean> {
  if (!AUTH_SECRET) return false;

  const parts = token.split(":");
  if (parts.length !== 3) return false;
  const [userIdStr, ts, providedHmac] = parts;

  const timestamp = parseInt(ts, 36);
  if (isNaN(timestamp)) return false;
  if (Date.now() - timestamp > SESSION_MAX_AGE) return false;

  const payload = `${userIdStr}:${ts}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(AUTH_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const expected = hex(sig);

  // Length-safe constant-time comparison
  if (expected.length !== providedHmac.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ providedHmac.charCodeAt(i);
  }
  return diff === 0;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect API routes (except public ones)
  if (!pathname.startsWith("/api/")) return NextResponse.next();
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token || !(await verifyTokenEdge(token))) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
