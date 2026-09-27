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

    // Reconcile rooms by name. The client sends the full desired list without
    // ids, so we match existing rows by name (update in place), insert new
    // names, and delete rows the client dropped. Deletes are guarded because a
    // room referenced by an encaissement cannot be removed (FK) — in that case
    // we keep it rather than aborting the whole save.
    if (body.rooms) {
      const provided = (body.rooms as { name: string; active?: boolean }[]).filter(
        (r) => r.name?.trim()
      );
      const providedNames = new Set(provided.map((r) => r.name));
      const existing = await db.select().from(rooms);

      for (const r of provided) {
        const match = existing.find((e) => e.name === r.name);
        if (match) {
          await db.update(rooms).set({ active: r.active ?? true }).where(eq(rooms.id, match.id));
        } else {
          await db.insert(rooms).values({ name: r.name, active: r.active ?? true });
        }
      }
      for (const e of existing) {
        if (!providedNames.has(e.name)) {
          try {
            await db.delete(rooms).where(eq(rooms.id, e.id));
          } catch {
            // Referenced by a transaction — leave it in place.
          }
        }
      }
    }

    // Reconcile categories by (name, type), same strategy as rooms.
    if (body.categories) {
      const provided = [
        ...(body.categories.encaissement || []).map((c: { name: string }) => ({ name: c.name, type: "encaissement" })),
        ...(body.categories.decaissement || []).map((c: { name: string }) => ({ name: c.name, type: "decaissement" })),
      ].filter((c) => c.name?.trim());
      const keyOf = (name: string, type: string) => `${type}:${name}`;
      const providedKeys = new Set(provided.map((c) => keyOf(c.name, c.type)));
      const existing = await db.select().from(categories);

      for (const c of provided) {
        const match = existing.find((e) => e.name === c.name && e.type === c.type);
        if (!match) {
          await db.insert(categories).values({ name: c.name, type: c.type });
        }
      }
      for (const e of existing) {
        if (!providedKeys.has(keyOf(e.name, e.type))) {
          try {
            await db.delete(categories).where(eq(categories.id, e.id));
          } catch {
            // Referenced by a transaction — leave it in place.
          }
        }
      }
    }

    // Reconcile currencies by code. Currencies are not referenced by a foreign
    // key (transactions store the currency as text), so deletes are safe.
    if (body.currencies) {
      const provided = (body.currencies as { code: string; rate: string }[]).filter(
        (c) => c.code?.trim()
      );
      const providedCodes = new Set(provided.map((c) => c.code));
      const existing = await db.select().from(currencies);

      for (const c of provided) {
        const match = existing.find((e) => e.code === c.code);
        if (match) {
          await db.update(currencies).set({ rate: c.rate }).where(eq(currencies.id, match.id));
        } else {
          await db.insert(currencies).values({ code: c.code, rate: c.rate });
        }
      }
      for (const e of existing) {
        if (!providedCodes.has(e.code)) {
          await db.delete(currencies).where(eq(currencies.id, e.id));
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
