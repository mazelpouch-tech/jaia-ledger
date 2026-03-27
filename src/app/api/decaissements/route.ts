import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { decaissements, categories } from "@/db/schema";
import { eq, and, or, ilike, sql, desc } from "drizzle-orm";

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
      conditions.push(sql`to_char(${decaissements.date}, 'YYYY-MM') = ${month}`);
    }

    if (category) {
      conditions.push(eq(categories.name, category));
    }

    if (search) {
      conditions.push(
        or(
          ilike(decaissements.description, `%${search}%`),
          ilike(decaissements.supplier, `%${search}%`),
          ilike(decaissements.reference, `%${search}%`)
        )!
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    let query = db
      .select({
        id: decaissements.id,
        date: decaissements.date,
        reference: decaissements.reference,
        categoryId: decaissements.categoryId,
        categoryName: categories.name,
        supplier: decaissements.supplier,
        description: decaissements.description,
        currency: decaissements.currency,
        amount: decaissements.amount,
        exchangeRate: decaissements.exchangeRate,
        paymentMethod: decaissements.paymentMethod,
        notes: decaissements.notes,
        createdAt: decaissements.createdAt,
      })
      .from(decaissements)
      .leftJoin(categories, eq(decaissements.categoryId, categories.id))
      .where(where)
      .orderBy(desc(decaissements.date))
      .$dynamic();

    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const data = await query;

    // Summary query
    const summaryQuery = db
      .select({
        total: sql<string>`coalesce(sum(${decaissements.amount}), '0')`,
        count: sql<number>`count(*)`,
        totalByCard: sql<string>`coalesce(sum(case when ${decaissements.paymentMethod} = 'Carte bancaire' then ${decaissements.amount} else 0 end), '0')`,
        totalByCash: sql<string>`coalesce(sum(case when ${decaissements.paymentMethod} = 'Espèces' then ${decaissements.amount} else 0 end), '0')`,
      })
      .from(decaissements)
      .leftJoin(categories, eq(decaissements.categoryId, categories.id))
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
    console.error("GET /api/decaissements error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const body = await request.json();

    const [created] = await db.insert(decaissements).values({
      date: body.date,
      reference: body.reference,
      categoryId: body.categoryId,
      supplier: body.supplier,
      description: body.description,
      currency: body.currency || "MAD",
      amount: body.amount,
      exchangeRate: body.exchangeRate || "1",
      paymentMethod: body.paymentMethod,
      notes: body.notes,
    }).returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("POST /api/decaissements error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
