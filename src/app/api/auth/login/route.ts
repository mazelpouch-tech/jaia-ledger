import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { verifyPassword, hashPassword, createSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ error: "Base de données non disponible" }, { status: 503 });
    }

    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: "Nom d'utilisateur et mot de passe requis" }, { status: 400 });
    }

    // Check if any users exist - if not, create the first admin
    const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(users);
    if (Number(countResult.count) === 0) {
      const passwordHash = await hashPassword(password);
      const [newUser] = await db
        .insert(users)
        .values({
          username: username.toLowerCase().trim(),
          displayName: username.trim(),
          passwordHash,
          role: "admin",
        })
        .returning({ id: users.id, username: users.username, displayName: users.displayName, role: users.role });

      await createSession(newUser.id);
      return NextResponse.json({
        user: { id: newUser.id, username: newUser.username, displayName: newUser.displayName, role: newUser.role },
        firstLogin: true,
      });
    }

    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username.toLowerCase().trim()))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "Identifiants incorrects" }, { status: 401 });
    }

    if (!user.active) {
      return NextResponse.json({ error: "Compte désactivé" }, { status: 403 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Identifiants incorrects" }, { status: 401 });
    }

    await createSession(user.id);

    return NextResponse.json({
      user: { id: user.id, username: user.username, displayName: user.displayName, role: user.role },
    });
  } catch (error) {
    console.error("POST /api/auth/login error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
