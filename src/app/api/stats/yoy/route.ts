import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { encaissements, decaissements } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    if (!db) return NextResponse.json({ currentEnc: 0, currentDec: 0, previousEnc: 0, previousDec: 0 });

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") || new Date().toISOString().slice(0, 7);

    const [year, monthNum] = month.split("-").map(Number);
    const lastYearMonth = `${year - 1}-${String(monthNum).padStart(2, "0")}`;

    const [currentEnc] = await db.select({ total: sql<string>`coalesce(sum(${encaissements.amount}), '0')` }).from(encaissements).where(sql`to_char(${encaissements.date}, 'YYYY-MM') = ${month}`);
    const [currentDec] = await db.select({ total: sql<string>`coalesce(sum(${decaissements.amount}), '0')` }).from(decaissements).where(sql`to_char(${decaissements.date}, 'YYYY-MM') = ${month}`);
    const [previousEnc] = await db.select({ total: sql<string>`coalesce(sum(${encaissements.amount}), '0')` }).from(encaissements).where(sql`to_char(${encaissements.date}, 'YYYY-MM') = ${lastYearMonth}`);
    const [previousDec] = await db.select({ total: sql<string>`coalesce(sum(${decaissements.amount}), '0')` }).from(decaissements).where(sql`to_char(${decaissements.date}, 'YYYY-MM') = ${lastYearMonth}`);

    return NextResponse.json({
      currentEnc: parseFloat(currentEnc.total),
      currentDec: parseFloat(currentDec.total),
      previousEnc: parseFloat(previousEnc.total),
      previousDec: parseFloat(previousDec.total),
      currentMonth: month,
      previousMonth: lastYearMonth,
    });
  } catch (error) {
    console.error("GET /api/stats/yoy error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
