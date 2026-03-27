import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { encaissements } from "@/db/schema";
import { eq } from "drizzle-orm";

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
      .update(encaissements)
      .set({
        date: body.date,
        checkIn: body.checkIn,
        checkOut: body.checkOut,
        categoryId: body.categoryId,
        roomId: body.roomId,
        client: body.client,
        description: body.description,
        currency: body.currency,
        amount: body.amount,
        exchangeRate: body.exchangeRate,
        paymentMethod: body.paymentMethod,
      })
      .where(eq(encaissements.id, parseInt(id)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/encaissements/[id] error:", error);
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
      .delete(encaissements)
      .where(eq(encaissements.id, parseInt(id)))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/encaissements/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
