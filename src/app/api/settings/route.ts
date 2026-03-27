import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { settings, rooms, categories, currencies } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(_request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({
        settings: {
          riadName: "Riad JAÏA",
          email: "contact@riadjaia.com",
          address: "Derb ..., Médina, Marrakech 40000, Maroc",
          phone: "+212 5 24 00 00 00",
          currency: "MAD",
          tvaRate: "10",
          ice: "",
          rc: "",
        },
        rooms: [],
        categories: { encaissement: [], decaissement: [] },
        currencies: [],
      });
    }

    const [settingsRow] = await db.select().from(settings).limit(1);
    const allRooms = await db.select().from(rooms);
    const allCategories = await db.select().from(categories);
    const allCurrencies = await db.select().from(currencies);

    const encCategories = allCategories.filter((c) => c.type === "encaissement");
    const decCategories = allCategories.filter((c) => c.type === "decaissement");

    return NextResponse.json({
      settings: settingsRow || null,
      rooms: allRooms,
      categories: { encaissement: encCategories, decaissement: decCategories },
      currencies: allCurrencies,
    });
  } catch (error) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const body = await request.json();

    // Update settings if provided
    if (body.settings) {
      const [existing] = await db.select().from(settings).limit(1);
      if (existing) {
        await db.update(settings).set(body.settings).where(eq(settings.id, existing.id));
      } else {
        await db.insert(settings).values(body.settings);
      }
    }

    // Update rooms if provided
    if (body.rooms) {
      for (const room of body.rooms) {
        if (room.id) {
          await db.update(rooms).set({ name: room.name, active: room.active }).where(eq(rooms.id, room.id));
        } else {
          await db.insert(rooms).values({ name: room.name, active: room.active ?? true });
        }
      }
    }

    // Update categories if provided
    if (body.categories) {
      const allCats = [
        ...(body.categories.encaissement || []).map((c: { id?: number; name: string }) => ({ ...c, type: "encaissement" })),
        ...(body.categories.decaissement || []).map((c: { id?: number; name: string }) => ({ ...c, type: "decaissement" })),
      ];
      for (const cat of allCats) {
        if (cat.id) {
          await db.update(categories).set({ name: cat.name, type: cat.type }).where(eq(categories.id, cat.id));
        } else {
          await db.insert(categories).values({ name: cat.name, type: cat.type });
        }
      }
    }

    // Update currencies if provided
    if (body.currencies) {
      for (const curr of body.currencies) {
        if (curr.id) {
          await db.update(currencies).set({ code: curr.code, rate: curr.rate }).where(eq(currencies.id, curr.id));
        } else {
          await db.insert(currencies).values({ code: curr.code, rate: curr.rate });
        }
      }
    }

    // Return updated data
    const [settingsRow] = await db.select().from(settings).limit(1);
    const allRooms = await db.select().from(rooms);
    const allCategories = await db.select().from(categories);
    const allCurrencies = await db.select().from(currencies);

    return NextResponse.json({
      settings: settingsRow || null,
      rooms: allRooms,
      categories: {
        encaissement: allCategories.filter((c) => c.type === "encaissement"),
        decaissement: allCategories.filter((c) => c.type === "decaissement"),
      },
      currencies: allCurrencies,
    });
  } catch (error) {
    console.error("PUT /api/settings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
