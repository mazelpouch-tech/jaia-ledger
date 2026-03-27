import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { encaissements, decaissements } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json([]);
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") || new Date().toISOString().slice(0, 7);

    // Daily encaissements
    const dailyEnc = await db
      .select({
        day: sql<string>`to_char(${encaissements.date}, 'YYYY-MM-DD')`,
        total: sql<string>`coalesce(sum(${encaissements.amount}), '0')`,
      })
      .from(encaissements)
      .where(sql`to_char(${encaissements.date}, 'YYYY-MM') = ${month}`)
      .groupBy(sql`to_char(${encaissements.date}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${encaissements.date}, 'YYYY-MM-DD')`);

    // Daily decaissements
    const dailyDec = await db
      .select({
        day: sql<string>`to_char(${decaissements.date}, 'YYYY-MM-DD')`,
        total: sql<string>`coalesce(sum(${decaissements.amount}), '0')`,
      })
      .from(decaissements)
      .where(sql`to_char(${decaissements.date}, 'YYYY-MM') = ${month}`)
      .groupBy(sql`to_char(${decaissements.date}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${decaissements.date}, 'YYYY-MM-DD')`);

    // Payment method breakdown for encaissements
    const encByMethod = await db
      .select({
        method: encaissements.paymentMethod,
        total: sql<string>`coalesce(sum(${encaissements.amount}), '0')`,
      })
      .from(encaissements)
      .where(sql`to_char(${encaissements.date}, 'YYYY-MM') = ${month}`)
      .groupBy(encaissements.paymentMethod);

    // Payment method breakdown for decaissements
    const decByMethod = await db
      .select({
        method: decaissements.paymentMethod,
        total: sql<string>`coalesce(sum(${decaissements.amount}), '0')`,
      })
      .from(decaissements)
      .where(sql`to_char(${decaissements.date}, 'YYYY-MM') = ${month}`)
      .groupBy(decaissements.paymentMethod);

    // Build daily data with running balance
    const encMap = new Map(dailyEnc.map((r) => [r.day, parseFloat(r.total)]));
    const decMap = new Map(dailyDec.map((r) => [r.day, parseFloat(r.total)]));
    const allDays = new Set([...encMap.keys(), ...decMap.keys()]);

    let runningBalance = 0;
    const daily = Array.from(allDays)
      .sort()
      .map((day) => {
        const enc = encMap.get(day) || 0;
        const dec = decMap.get(day) || 0;
        runningBalance += enc - dec;
        return {
          day,
          dayLabel: new Date(day).getDate(),
          enc,
          dec,
          runningBalance,
        };
      });

    return NextResponse.json({
      daily,
      encByMethod: encByMethod.map((r) => ({ method: r.method, total: parseFloat(r.total) })),
      decByMethod: decByMethod.map((r) => ({ method: r.method, total: parseFloat(r.total) })),
    });
  } catch (error) {
    console.error("GET /api/stats/daily error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
