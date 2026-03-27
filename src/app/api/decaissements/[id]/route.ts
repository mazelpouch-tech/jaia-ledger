import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { decaissements } from "@/db/schema";
import { eq } from "drizzle-orm";
import { logAudit } from "@/lib/audit";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const { id } = await params;
    const body = await request.json();

    const [updated] = await db
      .update(decaissements)
      .set({
        date: body.date,
        categoryId: body.categoryId,
        supplier: body.supplier,
        description: body.description,
        currency: body.currency,
        amount: body.amount,
        exchangeRate: body.exchangeRate,
        paymentMethod: body.paymentMethod,
        notes: body.notes,
      })
      .where(eq(decaissements.id, parseInt(id)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await logAudit("update", "decaissements", updated.id, body);

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/decaissements/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const { id } = await params;

    const [deleted] = await db
      .delete(decaissements)
      .where(eq(decaissements.id, parseInt(id)))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await logAudit("delete", "decaissements", deleted.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/decaissements/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
