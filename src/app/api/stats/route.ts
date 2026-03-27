import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { encaissements, decaissements, categories, rooms } from "@/db/schema";
import { eq, sql, count } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({
        totalEncaissements: 0,
        totalDecaissements: 0,
        countEncaissements: 0,
        countDecaissements: 0,
        prevMonthEncaissements: 0,
        prevMonthDecaissements: 0,
        encByCategory: [],
        decByCategory: [],
        encByRoom: [],
        avgRevenuePerDay: 0,
        avgExpensePerDay: 0,
        revpar: 0,
        margin: 0,
      });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") || new Date().toISOString().slice(0, 7);

    // Parse month to get previous month and days in month
    const [year, monthNum] = month.split("-").map(Number);
    const daysInMonth = new Date(year, monthNum, 0).getDate();
    const prevDate = new Date(year, monthNum - 2, 1);
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

    // Current month totals
    const [encTotal] = await db
      .select({
        total: sql<string>`coalesce(sum(${encaissements.amount}), '0')`,
        count: sql<number>`count(*)`,
      })
      .from(encaissements)
      .where(sql`to_char(${encaissements.date}, 'YYYY-MM') = ${month}`);

    const [decTotal] = await db
      .select({
        total: sql<string>`coalesce(sum(${decaissements.amount}), '0')`,
        count: sql<number>`count(*)`,
      })
      .from(decaissements)
      .where(sql`to_char(${decaissements.date}, 'YYYY-MM') = ${month}`);

    // Previous month totals
    const [prevEnc] = await db
      .select({
        total: sql<string>`coalesce(sum(${encaissements.amount}), '0')`,
      })
      .from(encaissements)
      .where(sql`to_char(${encaissements.date}, 'YYYY-MM') = ${prevMonth}`);

    const [prevDec] = await db
      .select({
        total: sql<string>`coalesce(sum(${decaissements.amount}), '0')`,
      })
      .from(decaissements)
      .where(sql`to_char(${decaissements.date}, 'YYYY-MM') = ${prevMonth}`);

    // Encaissements by category
    const encByCategory = await db
      .select({
        name: sql<string>`coalesce(${categories.name}, 'Non catégorisé')`,
        total: sql<string>`coalesce(sum(${encaissements.amount}), '0')`,
      })
      .from(encaissements)
      .leftJoin(categories, eq(encaissements.categoryId, categories.id))
      .where(sql`to_char(${encaissements.date}, 'YYYY-MM') = ${month}`)
      .groupBy(categories.name);

    // Decaissements by category
    const decByCategory = await db
      .select({
        name: sql<string>`coalesce(${categories.name}, 'Non catégorisé')`,
        total: sql<string>`coalesce(sum(${decaissements.amount}), '0')`,
      })
      .from(decaissements)
      .leftJoin(categories, eq(decaissements.categoryId, categories.id))
      .where(sql`to_char(${decaissements.date}, 'YYYY-MM') = ${month}`)
      .groupBy(categories.name);

    // Encaissements by room
    const encByRoom = await db
      .select({
        name: sql<string>`coalesce(${rooms.name}, 'Non assigné')`,
        total: sql<string>`coalesce(sum(${encaissements.amount}), '0')`,
      })
      .from(encaissements)
      .leftJoin(rooms, eq(encaissements.roomId, rooms.id))
      .where(sql`to_char(${encaissements.date}, 'YYYY-MM') = ${month}`)
      .groupBy(rooms.name);

    // Count active rooms dynamically
    const [roomCount] = await db
      .select({ count: count() })
      .from(rooms)
      .where(eq(rooms.active, true));
    const numRooms = Number(roomCount.count) || 9; // fallback to 9

    const totalEnc = parseFloat(encTotal.total);
    const totalDec = parseFloat(decTotal.total);

    return NextResponse.json({
      totalEncaissements: totalEnc,
      totalDecaissements: totalDec,
      countEncaissements: Number(encTotal.count),
      countDecaissements: Number(decTotal.count),
      prevMonthEncaissements: parseFloat(prevEnc.total),
      prevMonthDecaissements: parseFloat(prevDec.total),
      encByCategory: encByCategory.map((r) => ({ name: r.name, total: parseFloat(r.total) })),
      decByCategory: decByCategory.map((r) => ({ name: r.name, total: parseFloat(r.total) })),
      encByRoom: encByRoom.map((r) => ({ name: r.name, total: parseFloat(r.total) })),
      avgRevenuePerDay: Math.round((totalEnc / daysInMonth) * 100) / 100,
      avgExpensePerDay: Math.round((totalDec / daysInMonth) * 100) / 100,
      revpar: Math.round((totalEnc / numRooms / daysInMonth) * 100) / 100,
      numRooms,
      margin: totalEnc > 0 ? Math.round(((totalEnc - totalDec) / totalEnc) * 10000) / 100 : 0,
    });
  } catch (error) {
    console.error("GET /api/stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
