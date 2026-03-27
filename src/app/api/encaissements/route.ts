import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { encaissements, categories, rooms } from "@/db/schema";
import { eq, and, or, ilike, sql, desc } from "drizzle-orm";
import { logAudit } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ data: [], summary: { total: 0, count: 0, totalByCard: 0, totalByCash: 0 } });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const limit = searchParams.get("limit");

    const conditions = [];

    if (month) {
      conditions.push(sql`to_char(${encaissements.date}, 'YYYY-MM') = ${month}`);
    }

    if (category) {
      conditions.push(eq(categories.name, category));
    }

    if (search) {
      conditions.push(
        or(
          ilike(encaissements.description, `%${search}%`),
          ilike(encaissements.client, `%${search}%`),
          ilike(encaissements.reference, `%${search}%`)
        )!
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    let query = db
      .select({
        id: encaissements.id,
        date: encaissements.date,
        reference: encaissements.reference,
        checkIn: encaissements.checkIn,
        checkOut: encaissements.checkOut,
        categoryId: encaissements.categoryId,
        categoryName: categories.name,
        roomId: encaissements.roomId,
        roomName: rooms.name,
        client: encaissements.client,
        description: encaissements.description,
        currency: encaissements.currency,
        amount: encaissements.amount,
        exchangeRate: encaissements.exchangeRate,
        paymentMethod: encaissements.paymentMethod,
        createdAt: encaissements.createdAt,
      })
      .from(encaissements)
      .leftJoin(categories, eq(encaissements.categoryId, categories.id))
      .leftJoin(rooms, eq(encaissements.roomId, rooms.id))
      .where(where)
      .orderBy(desc(encaissements.date))
      .$dynamic();

    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const data = await query;

    // Summary query
    const summaryQuery = db
      .select({
        total: sql<string>`coalesce(sum(${encaissements.amount}), '0')`,
        count: sql<number>`count(*)`,
        totalByCard: sql<string>`coalesce(sum(case when ${encaissements.paymentMethod} = 'Carte bancaire' then ${encaissements.amount} else 0 end), '0')`,
        totalByCash: sql<string>`coalesce(sum(case when ${encaissements.paymentMethod} = 'Espèces' then ${encaissements.amount} else 0 end), '0')`,
      })
      .from(encaissements)
      .leftJoin(categories, eq(encaissements.categoryId, categories.id))
      .where(where);

    const [summary] = await summaryQuery;

    return NextResponse.json({
      data,
      summary: {
        total: parseFloat(summary.total),
        count: Number(summary.count),
        totalByCard: parseFloat(summary.totalByCard),
        totalByCash: parseFloat(summary.totalByCash),
      },
    });
  } catch (error) {
    console.error("GET /api/encaissements error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const body = await request.json();

    // Accept both French (form) and English (API) field names
    const categoryName = body.categorie || body.category;
    const roomName = body.chambre || body.room;
    const amount = body.montant ?? body.amount;
    const paymentMethod = body.modeReglement || body.paymentMethod;
    const currency = body.devise || body.currency || "MAD";
    const exchangeRate = body.tauxChange ?? body.exchangeRate ?? "1";

    // Look up categoryId by name if needed
    let categoryId = body.categoryId;
    if (!categoryId && categoryName) {
      const [cat] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(and(eq(categories.name, categoryName), eq(categories.type, "encaissement")))
        .limit(1);
      categoryId = cat?.id ?? null;
    }

    // Look up roomId by name if needed
    let roomId = body.roomId;
    if (!roomId && roomName) {
      const [room] = await db
        .select({ id: rooms.id })
        .from(rooms)
        .where(eq(rooms.name, roomName))
        .limit(1);
      roomId = room?.id ?? null;
    }

    // Duplicate detection
    const forceInsert = new URL(request.url).searchParams.get("force") === "true";

    if (!forceInsert) {
      const duplicates = await db
        .select({ id: encaissements.id })
        .from(encaissements)
        .where(
          and(
            eq(encaissements.date, body.date),
            eq(encaissements.amount, String(amount)),
            eq(encaissements.description, body.description)
          )
        )
        .limit(1);

      if (duplicates.length > 0) {
        return NextResponse.json(
          { warning: "Un encaissement similaire existe déjà (même date, montant et description). Ajoutez ?force=true pour confirmer.", duplicate: true },
          { status: 409 }
        );
      }
    }

    const [created] = await db.insert(encaissements).values({
      date: body.date,
      reference: body.reference,
      checkIn: body.checkIn,
      checkOut: body.checkOut,
      categoryId,
      roomId,
      client: body.client,
      description: body.description,
      currency,
      amount: String(amount),
      exchangeRate: String(exchangeRate),
      paymentMethod,
    }).returning();

    await logAudit("create", "encaissements", created.id);

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("POST /api/encaissements error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
