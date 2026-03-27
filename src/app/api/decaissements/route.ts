import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { decaissements, categories } from "@/db/schema";
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

    // Accept both French (form) and English (API) field names
    const categoryName = body.categorie || body.category;
    const amount = body.montant ?? body.amount;
    const paymentMethod = body.modeReglement || body.paymentMethod;
    const currency = body.devise || body.currency || "MAD";
    const exchangeRate = body.tauxChange ?? body.exchangeRate ?? "1";
    const supplier = body.fournisseur || body.supplier;

    // Look up categoryId by name if needed
    let categoryId = body.categoryId;
    if (!categoryId && categoryName) {
      const [cat] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(and(eq(categories.name, categoryName), eq(categories.type, "decaissement")))
        .limit(1);
      categoryId = cat?.id ?? null;
    }

    // Duplicate detection
    const forceInsert = new URL(request.url).searchParams.get("force") === "true";

    if (!forceInsert) {
      const duplicates = await db
        .select({ id: decaissements.id })
        .from(decaissements)
        .where(
          and(
            eq(decaissements.date, body.date),
            eq(decaissements.amount, String(amount)),
            eq(decaissements.description, body.description)
          )
        )
        .limit(1);

      if (duplicates.length > 0) {
        return NextResponse.json(
          { warning: "Un décaissement similaire existe déjà (même date, montant et description). Ajoutez ?force=true pour confirmer.", duplicate: true },
          { status: 409 }
        );
      }
    }

    const [created] = await db.insert(decaissements).values({
      date: body.date,
      reference: body.reference,
      categoryId,
      supplier,
      description: body.description,
      currency,
      amount: String(amount),
      exchangeRate: String(exchangeRate),
      paymentMethod,
      notes: body.notes,
    }).returning();

    await logAudit("create", "decaissements", created.id);

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("POST /api/decaissements error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
