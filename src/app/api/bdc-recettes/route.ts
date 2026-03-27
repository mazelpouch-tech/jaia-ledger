import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bdcRecettes, bdcRecetteItems } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(_request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json([]);
    }

    const database = db!;
    const bdcs = await database
      .select()
      .from(bdcRecettes)
      .orderBy(desc(bdcRecettes.createdAt));

    const result = await Promise.all(
      bdcs.map(async (bdc) => {
        const items = await database
          .select()
          .from(bdcRecetteItems)
          .where(eq(bdcRecetteItems.bdcId, bdc.id));

        const itemsWithTotals = items.map((item) => {
          const ht = Number(item.quantity) * parseFloat(item.unitPrice);
          const tva = ht * (parseFloat(item.tvaRate || "10") / 100);
          const ttc = ht + tva;
          return { ...item, ht, tva, ttc };
        });

        const totalHT = itemsWithTotals.reduce((s, i) => s + i.ht, 0);
        const totalTVA = itemsWithTotals.reduce((s, i) => s + i.tva, 0);
        const totalTTC = itemsWithTotals.reduce((s, i) => s + i.ttc, 0);

        return {
          ...bdc,
          items: itemsWithTotals,
          totalHT: Math.round(totalHT * 100) / 100,
          totalTVA: Math.round(totalTVA * 100) / 100,
          totalTTC: Math.round(totalTTC * 100) / 100,
        };
      })
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/bdc-recettes error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const body = await request.json();

    // Auto-generate number BDR-XXX
    const [lastBdc] = await db
      .select({ number: bdcRecettes.number })
      .from(bdcRecettes)
      .orderBy(desc(bdcRecettes.id))
      .limit(1);

    let nextNum = 1;
    if (lastBdc?.number) {
      const match = lastBdc.number.match(/BDR-(\d+)/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }
    const number = `BDR-${String(nextNum).padStart(3, "0")}`;

    const [created] = await db
      .insert(bdcRecettes)
      .values({
        number,
        date: body.date,
        client: body.client,
        status: body.status || "brouillon",
      })
      .returning();

    // Insert items
    if (body.items && body.items.length > 0) {
      await db.insert(bdcRecetteItems).values(
        body.items.map((item: { description: string; quantity: number; unitPrice: string; tvaRate?: string }) => ({
          bdcId: created.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          tvaRate: item.tvaRate || "10",
        }))
      );
    }

    // Return with items
    const items = await db
      .select()
      .from(bdcRecetteItems)
      .where(eq(bdcRecetteItems.bdcId, created.id));

    return NextResponse.json({ ...created, items }, { status: 201 });
  } catch (error) {
    console.error("POST /api/bdc-recettes error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
