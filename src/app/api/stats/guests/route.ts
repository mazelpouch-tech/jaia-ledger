import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { encaissements } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    if (!db) return NextResponse.json({ topClients: [], repeatGuests: 0, totalGuests: 0 });

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");

    const whereClause = month
      ? sql`where ${encaissements.client} is not null and ${encaissements.client} != '' and to_char(${encaissements.date}, 'YYYY-MM') = ${month}`
      : sql`where ${encaissements.client} is not null and ${encaissements.client} != ''`;

    const topClients = await db.execute(sql`
      select
        ${encaissements.client} as client,
        sum(${encaissements.amount})::numeric as "totalAmount",
        count(*)::int as "visitCount"
      from ${encaissements}
      ${whereClause}
      group by ${encaissements.client}
      order by sum(${encaissements.amount}) desc
      limit 10
    `);

    const guestStats = await db.execute(sql`
      select
        count(distinct ${encaissements.client})::int as "totalGuests",
        count(distinct case when sub.cnt > 1 then sub.client end)::int as "repeatGuests"
      from (
        select ${encaissements.client} as client, count(*) as cnt
        from ${encaissements}
        ${whereClause}
        group by ${encaissements.client}
      ) sub
    `);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const guestRows = (guestStats as any).rows ?? guestStats;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stats: any = Array.isArray(guestRows) ? guestRows[0] : { totalGuests: 0, repeatGuests: 0 };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clientRows = (topClients as any).rows ?? topClients;

    return NextResponse.json({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      topClients: (Array.isArray(clientRows) ? clientRows : []).map((r: any) => ({
        client: r.client,
        totalAmount: parseFloat(r.totalAmount),
        visitCount: Number(r.visitCount),
      })),
      repeatGuests: Number(stats?.repeatGuests ?? 0),
      totalGuests: Number(stats?.totalGuests ?? 0),
    });
  } catch (error) {
    console.error("GET /api/stats/guests error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
