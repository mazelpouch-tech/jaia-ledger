import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser, hashPassword } from "@/lib/auth";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  if (!db) return NextResponse.json({ users: [] });

  const allUsers = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      role: users.role,
      active: users.active,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(users.createdAt);

  return NextResponse.json({ users: allUsers });
}

export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  if (!db) return NextResponse.json({ error: "DB non disponible" }, { status: 503 });

  const { username, displayName, password, role } = await request.json();

  if (!username || !password || !displayName) {
    return NextResponse.json({ error: "Tous les champs sont requis" }, { status: 400 });
  }

  if (password.length < 4) {
    return NextResponse.json({ error: "Le mot de passe doit contenir au moins 4 caractères" }, { status: 400 });
  }

  // Check duplicate username
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username.toLowerCase().trim()))
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json({ error: "Ce nom d'utilisateur existe déjà" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const [newUser] = await db
    .insert(users)
    .values({
      username: username.toLowerCase().trim(),
      displayName: displayName.trim(),
      passwordHash,
      role: role === "admin" ? "admin" : "user",
    })
    .returning({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      role: users.role,
      active: users.active,
    });

  return NextResponse.json({ user: newUser }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  if (!db) return NextResponse.json({ error: "DB non disponible" }, { status: 503 });

  const { id, displayName, password, role, active } = await request.json();

  if (!id) {
    return NextResponse.json({ error: "ID utilisateur requis" }, { status: 400 });
  }

  // Prevent admin from deactivating themselves
  if (id === currentUser.id && active === false) {
    return NextResponse.json({ error: "Vous ne pouvez pas désactiver votre propre compte" }, { status: 400 });
  }

  const updateData: Record<string, string | boolean> = {};
  if (displayName) updateData.displayName = displayName.trim();
  if (role && (role === "admin" || role === "user")) updateData.role = role;
  if (typeof active === "boolean") updateData.active = active;
  if (password) {
    if (password.length < 4) {
      return NextResponse.json({ error: "Le mot de passe doit contenir au moins 4 caractères" }, { status: 400 });
    }
    updateData.passwordHash = await hashPassword(password);
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "Rien à mettre à jour" }, { status: 400 });
  }

  await db.update(users).set(updateData).where(eq(users.id, id));

  return NextResponse.json({ ok: true });
}
