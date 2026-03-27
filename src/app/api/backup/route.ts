import { NextResponse } from "next/server";
import { db } from "@/db";
import { encaissements, decaissements, categories, rooms, settings, currencies } from "@/db/schema";

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
