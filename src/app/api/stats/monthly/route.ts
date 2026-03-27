import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { encaissements, decaissements } from "@/db/schema";
import { sql } from "drizzle-orm";

const MONTH_LABELS: Record<string, string> = {
  "01": "janvier",
  "02": "février",
  "03": "mars",
  "04": "avril",
  "05": "mai",
  "06": "juin",
  "07": "juillet",
  "08": "août",
  "09": "septembre",
  "10": "octobre",
  "11": "novembre",
  "12": "décembre",
};

export async function GET(_request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json([]);
    }

    // Get all months with encaissements
    const encMonths = await db
      .select({
        month: sql<string>`to_char(${encaissements.date}, 'YYYY-MM')`,
        total: sql<string>`coalesce(sum(${encaissements.amount}), '0')`,
      })
      .from(encaissements)
      .groupBy(sql`to_char(${encaissements.date}, 'YYYY-MM')`);

    // Get all months with decaissements
    const decMonths = await db
      .select({
        month: sql<string>`to_char(${decaissements.date}, 'YYYY-MM')`,
        total: sql<string>`coalesce(sum(${decaissements.amount}), '0')`,
      })
      .from(decaissements)
      .groupBy(sql`to_char(${decaissements.date}, 'YYYY-MM')`);

    // Merge months
    const encMap = new Map(encMonths.map((r) => [r.month, parseFloat(r.total)]));
    const decMap = new Map(decMonths.map((r) => [r.month, parseFloat(r.total)]));

    const allMonths = new Set([...encMap.keys(), ...decMap.keys()]);

    const result = Array.from(allMonths)
      .map((month) => {
        const totalEnc = encMap.get(month) || 0;
        const totalDec = decMap.get(month) || 0;
        const solde = totalEnc - totalDec;
        const [yearStr, monthNum] = month.split("-");
        const monthLabel = `${MONTH_LABELS[monthNum]} ${yearStr}`;

        return {
          month,
          monthLabel,
          totalEnc,
          totalDec,
          solde,
          margin: totalEnc > 0 ? Math.round(((totalEnc - totalDec) / totalEnc) * 10000) / 100 : 0,
        };
      })
      .sort((a, b) => b.month.localeCompare(a.month));

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/stats/monthly error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
