import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { encaissements, decaissements, categories } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ encTrends: [], decTrends: [] });
    }

    const { searchParams } = new URL(request.url);
    const months = parseInt(searchParams.get("months") || "6");

    // Get last N months of encaissements by category
    const encTrends = await db
      .select({
        month: sql<string>`to_char(${encaissements.date}, 'YYYY-MM')`,
        category: sql<string>`coalesce(${categories.name}, 'Non catégorisé')`,
        total: sql<string>`coalesce(sum(${encaissements.amount}), '0')`,
      })
      .from(encaissements)
      .leftJoin(categories, eq(encaissements.categoryId, categories.id))
      .where(
        sql`${encaissements.date} >= date_trunc('month', current_date - interval '${sql.raw(String(months - 1))} months')`
      )
      .groupBy(sql`to_char(${encaissements.date}, 'YYYY-MM')`, categories.name)
      .orderBy(sql`to_char(${encaissements.date}, 'YYYY-MM')`);

    // Get last N months of decaissements by category
    const decTrends = await db
      .select({
        month: sql<string>`to_char(${decaissements.date}, 'YYYY-MM')`,
        category: sql<string>`coalesce(${categories.name}, 'Non catégorisé')`,
        total: sql<string>`coalesce(sum(${decaissements.amount}), '0')`,
      })
      .from(decaissements)
      .leftJoin(categories, eq(decaissements.categoryId, categories.id))
      .where(
        sql`${decaissements.date} >= date_trunc('month', current_date - interval '${sql.raw(String(months - 1))} months')`
      )
      .groupBy(sql`to_char(${decaissements.date}, 'YYYY-MM')`, categories.name)
      .orderBy(sql`to_char(${decaissements.date}, 'YYYY-MM')`);

    // Transform into structured format: { category, data: [{month, total}] }
    const encByCategory = new Map<string, { month: string; total: number }[]>();
    for (const row of encTrends) {
      const arr = encByCategory.get(row.category) || [];
      arr.push({ month: row.month, total: parseFloat(row.total) });
      encByCategory.set(row.category, arr);
    }

    const decByCategory = new Map<string, { month: string; total: number }[]>();
    for (const row of decTrends) {
      const arr = decByCategory.get(row.category) || [];
      arr.push({ month: row.month, total: parseFloat(row.total) });
      decByCategory.set(row.category, arr);
    }

    return NextResponse.json({
      encTrends: Array.from(encByCategory.entries()).map(([category, data]) => ({
        category,
        data,
        total: data.reduce((s, d) => s + d.total, 0),
      })).sort((a, b) => b.total - a.total),
      decTrends: Array.from(decByCategory.entries()).map(([category, data]) => ({
        category,
        data,
        total: data.reduce((s, d) => s + d.total, 0),
      })).sort((a, b) => b.total - a.total),
    });
  } catch (error) {
    console.error("GET /api/stats/category-trends error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
