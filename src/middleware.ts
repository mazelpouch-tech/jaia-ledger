import { NextRequest, NextResponse } from "next/server";

const AUTH_SECRET = process.env.AUTH_SECRET || "jaia-ledger-default-secret-change-me";
const SESSION_COOKIE = "jaia-session";
const SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

// Public routes that don't require auth
const PUBLIC_PATHS = ["/api/auth/login", "/api/auth/logout", "/api/auth/me", "/api/auth/setup-check"];

function verifyTokenEdge(token: string): boolean {
  // Lightweight check without crypto import (edge-compatible)
  const parts = token.split(":");
  if (parts.length !== 3) return false;
  const [, ts] = parts;
  const timestamp = parseInt(ts, 36);
  if (isNaN(timestamp)) return false;
  if (Date.now() - timestamp > SESSION_MAX_AGE) return false;
  // Full HMAC verification happens in the API route itself
  return true;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect API routes (except public ones)
  if (!pathname.startsWith("/api/")) return NextResponse.next();
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token || !verifyTokenEdge(token)) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
