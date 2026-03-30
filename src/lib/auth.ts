import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import crypto from "crypto";

const AUTH_SECRET = process.env.AUTH_SECRET || "jaia-ledger-default-secret-change-me";
const SESSION_COOKIE = "jaia-session";
const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

// --- Password hashing with PBKDF2 ---

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const verify = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return hash === verify;
}

// --- Session token (userId:timestamp:hmac) ---

function signToken(userId: number): string {
  const ts = Date.now().toString(36);
  const payload = `${userId}:${ts}`;
  const hmac = crypto.createHmac("sha256", AUTH_SECRET).update(payload).digest("hex");
  return `${payload}:${hmac}`;
}

function verifyToken(token: string): { userId: number; timestamp: number } | null {
  const parts = token.split(":");
  if (parts.length !== 3) return null;
  const [userIdStr, ts, hmac] = parts;
  const payload = `${userIdStr}:${ts}`;
  const expected = crypto.createHmac("sha256", AUTH_SECRET).update(payload).digest("hex");
  if (hmac !== expected) return null;

  const userId = parseInt(userIdStr, 10);
  const timestamp = parseInt(ts, 36);
  if (isNaN(userId) || isNaN(timestamp)) return null;

  // Check expiry
  if (Date.now() - timestamp > SESSION_MAX_AGE * 1000) return null;

  return { userId, timestamp };
}

// --- Session management ---

export async function createSession(userId: number) {
  const token = signToken(userId);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  if (!db) return null;
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const parsed = verifyToken(token);
  if (!parsed) return null;

  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      role: users.role,
      active: users.active,
    })
    .from(users)
    .where(eq(users.id, parsed.userId))
    .limit(1);

  if (!user || !user.active) return null;
  return user;
}

// Lightweight token check for middleware (no DB call)
export function verifySessionToken(token: string): { userId: number } | null {
  const parsed = verifyToken(token);
  if (!parsed) return null;
  return { userId: parsed.userId };
}

export { SESSION_COOKIE };
