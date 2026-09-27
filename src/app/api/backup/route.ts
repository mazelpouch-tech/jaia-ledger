import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { encaissements, decaissements, categories, rooms, settings, currencies } from "@/db/schema";
import { logAudit } from "@/lib/audit";

export async function GET() {
  try {
    if (!db) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

    const [allEnc, allDec, allCat, allRooms, allSettings, allCurrencies] = await Promise.all([
      db.select().from(encaissements),
      db.select().from(decaissements),
      db.select().from(categories),
      db.select().from(rooms),
      db.select().from(settings),
      db.select().from(currencies),
    ]);

    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        encaissements: allEnc,
        decaissements: allDec,
        categories: allCat,
        rooms: allRooms,
        settings: allSettings,
        currencies: allCurrencies,
      },
    };

    return new NextResponse(JSON.stringify(backup, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="jaia-ledger-backup-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error) {
    console.error("GET /api/backup error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Rows as they appear in an exported backup file.
interface BackupCategory { id?: number; name?: string; type?: string }
interface BackupRoom { id?: number; name?: string; active?: boolean | null }
interface BackupCurrency { code?: string; rate?: string | number }
interface BackupSettings {
  riadName?: string; email?: string; address?: string; phone?: string;
  currency?: string; ice?: string; rc?: string; tvaRate?: string | number;
}
interface BackupEncaissement {
  date?: string; reference?: string; checkIn?: string | null; checkOut?: string | null;
  categoryId?: number | null; roomId?: number | null; client?: string | null;
  description?: string; currency?: string | null; amount?: string | number;
  exchangeRate?: string | number | null; paymentMethod?: string; createdAt?: string | null;
}
interface BackupDecaissement {
  date?: string; reference?: string; categoryId?: number | null; supplier?: string | null;
  description?: string; currency?: string | null; amount?: string | number;
  exchangeRate?: string | number | null; paymentMethod?: string; notes?: string | null;
  createdAt?: string | null;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

// Restore a backup produced by GET above. This REPLACES the six backed-up
// tables (encaissements, decaissements, categories, rooms, settings,
// currencies); bons de commande, users, and the audit log are untouched.
// Category and room ids are remapped on insert so restored transactions keep
// valid foreign keys and the id sequences stay consistent for future inserts.
//
// Note: the Neon HTTP driver does not run this as a single rollback-able
// transaction, so the payload is validated up front to make a mid-restore
// failure unlikely.
export async function POST(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }
    const database = db;

    let backup: unknown;
    try {
      backup = await request.json();
    } catch {
      return NextResponse.json({ error: "Fichier de sauvegarde invalide (JSON illisible)" }, { status: 400 });
    }

    const data = (backup as { data?: unknown })?.data;
    if (!data || typeof data !== "object") {
      return NextResponse.json(
        { error: "Fichier de sauvegarde invalide : champ 'data' manquant" },
        { status: 400 }
      );
    }
    const d = data as Record<string, unknown>;

    const backupCategories = asArray<BackupCategory>(d.categories);
    const backupRooms = asArray<BackupRoom>(d.rooms);
    const backupCurrencies = asArray<BackupCurrency>(d.currencies);
    const backupSettings = asArray<BackupSettings>(d.settings);
    const backupEnc = asArray<BackupEncaissement>(d.encaissements);
    const backupDec = asArray<BackupDecaissement>(d.decaissements);

    // Clear existing data, children before parents (transactions reference
    // categories and rooms via foreign keys).
    await database.delete(encaissements);
    await database.delete(decaissements);
    await database.delete(categories);
    await database.delete(rooms);
    await database.delete(settings);
    await database.delete(currencies);

    // Categories: insert fresh and map old id -> new id.
    const categoryIdMap = new Map<number, number>();
    for (const cat of backupCategories) {
      if (!cat.name || !cat.type) continue;
      const [inserted] = await database
        .insert(categories)
        .values({ name: cat.name, type: cat.type })
        .returning({ id: categories.id });
      if (cat.id != null) categoryIdMap.set(cat.id, inserted.id);
    }

    // Rooms: insert fresh and map old id -> new id.
    const roomIdMap = new Map<number, number>();
    for (const room of backupRooms) {
      if (!room.name) continue;
      const [inserted] = await database
        .insert(rooms)
        .values({ name: room.name, active: room.active ?? true })
        .returning({ id: rooms.id });
      if (room.id != null) roomIdMap.set(room.id, inserted.id);
    }

    // Currencies (no foreign keys).
    for (const cur of backupCurrencies) {
      if (!cur.code) continue;
      await database.insert(currencies).values({ code: cur.code, rate: String(cur.rate ?? "1") });
    }

    // Settings (single logical row; insert whatever the backup carried).
    for (const s of backupSettings) {
      await database.insert(settings).values({
        riadName: s.riadName ?? "Riad JAÏA",
        email: s.email,
        address: s.address,
        phone: s.phone,
        currency: s.currency,
        ice: s.ice,
        rc: s.rc,
        tvaRate: s.tvaRate != null ? String(s.tvaRate) : undefined,
      });
    }

    // Encaissements with remapped category/room ids.
    const remappedEnc = backupEnc
      .filter((e) => e.date && e.description != null && e.amount != null && e.paymentMethod)
      .map((e) => ({
        date: e.date as string,
        reference: e.reference ?? "",
        checkIn: e.checkIn ?? null,
        checkOut: e.checkOut ?? null,
        categoryId: e.categoryId != null ? categoryIdMap.get(e.categoryId) ?? null : null,
        roomId: e.roomId != null ? roomIdMap.get(e.roomId) ?? null : null,
        client: e.client ?? null,
        description: e.description as string,
        currency: e.currency ?? "MAD",
        amount: String(e.amount),
        exchangeRate: e.exchangeRate != null ? String(e.exchangeRate) : "1",
        paymentMethod: e.paymentMethod as string,
        createdAt: e.createdAt ? new Date(e.createdAt) : undefined,
      }));
    if (remappedEnc.length > 0) {
      await database.insert(encaissements).values(remappedEnc);
    }

    // Decaissements with remapped category ids.
    const remappedDec = backupDec
      .filter((x) => x.date && x.description != null && x.amount != null && x.paymentMethod)
      .map((x) => ({
        date: x.date as string,
        reference: x.reference ?? "",
        categoryId: x.categoryId != null ? categoryIdMap.get(x.categoryId) ?? null : null,
        supplier: x.supplier ?? null,
        description: x.description as string,
        currency: x.currency ?? "MAD",
        amount: String(x.amount),
        exchangeRate: x.exchangeRate != null ? String(x.exchangeRate) : "1",
        paymentMethod: x.paymentMethod as string,
        notes: x.notes ?? null,
        createdAt: x.createdAt ? new Date(x.createdAt) : undefined,
      }));
    if (remappedDec.length > 0) {
      await database.insert(decaissements).values(remappedDec);
    }

    const counts = {
      encaissements: remappedEnc.length,
      decaissements: remappedDec.length,
      categories: categoryIdMap.size,
      rooms: roomIdMap.size,
      currencies: backupCurrencies.length,
    };
    await logAudit("restore", "backup", null, counts);

    return NextResponse.json({ success: true, counts });
  } catch (error) {
    console.error("POST /api/backup error:", error);
    return NextResponse.json({ error: "Erreur lors de la restauration" }, { status: 500 });
  }
}
