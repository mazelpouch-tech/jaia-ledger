import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { encaissements, decaissements, currencies as currenciesTable } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({
        encByMethod: [],
        decByMethod: [],
        totalEncaissements: 0,
        totalDecaissements: 0,
        encByCurrency: [],
        decByCurrency: [],
        currencyRates: [],
      });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") || new Date().toISOString().slice(0, 7);

    // Encaissements by payment method
    const encByMethod = await db
      .select({
        method: encaissements.paymentMethod,
        total: sql<string>`coalesce(sum(${encaissements.amount}), '0')`,
      })
      .from(encaissements)
      .where(sql`to_char(${encaissements.date}, 'YYYY-MM') = ${month}`)
      .groupBy(encaissements.paymentMethod);

    // Decaissements by payment method
    const decByMethod = await db
      .select({
        method: decaissements.paymentMethod,
        total: sql<string>`coalesce(sum(${decaissements.amount}), '0')`,
      })
      .from(decaissements)
      .where(sql`to_char(${decaissements.date}, 'YYYY-MM') = ${month}`)
      .groupBy(decaissements.paymentMethod);

    // Totals
    const [encTotal] = await db
      .select({ total: sql<string>`coalesce(sum(${encaissements.amount}), '0')` })
      .from(encaissements)
      .where(sql`to_char(${encaissements.date}, 'YYYY-MM') = ${month}`);

    const [decTotal] = await db
      .select({ total: sql<string>`coalesce(sum(${decaissements.amount}), '0')` })
      .from(decaissements)
      .where(sql`to_char(${decaissements.date}, 'YYYY-MM') = ${month}`);

    // Encaissements by currency (original currency amounts)
    const encByCurrency = await db
      .select({
        currency: encaissements.currency,
        total: sql<string>`coalesce(sum(
          case when ${encaissements.currency} = 'MAD' then ${encaissements.amount}
          else ${encaissements.amount} / nullif(cast(${encaissements.exchangeRate} as numeric), 0)
          end
        ), '0')`,
      })
      .from(encaissements)
      .where(sql`to_char(${encaissements.date}, 'YYYY-MM') = ${month}`)
      .groupBy(encaissements.currency);

    // Decaissements by currency
    const decByCurrency = await db
      .select({
        currency: decaissements.currency,
        total: sql<string>`coalesce(sum(
          case when ${decaissements.currency} = 'MAD' then ${decaissements.amount}
          else ${decaissements.amount} / nullif(cast(${decaissements.exchangeRate} as numeric), 0)
          end
        ), '0')`,
      })
      .from(decaissements)
      .where(sql`to_char(${decaissements.date}, 'YYYY-MM') = ${month}`)
      .groupBy(decaissements.currency);

    // Currency rates
    const rates = await db.select().from(currenciesTable);

    return NextResponse.json({
      encByMethod: encByMethod.map((r) => ({ method: r.method, total: parseFloat(r.total) })),
      decByMethod: decByMethod.map((r) => ({ method: r.method, total: parseFloat(r.total) })),
      totalEncaissements: parseFloat(encTotal.total),
      totalDecaissements: parseFloat(decTotal.total),
      encByCurrency: encByCurrency.map((r) => ({ currency: r.currency, total: parseFloat(r.total) })),
      decByCurrency: decByCurrency.map((r) => ({ currency: r.currency, total: parseFloat(r.total) })),
      currencyRates: rates.map((r) => ({ code: r.code, rate: parseFloat(r.rate) })),
    });
  } catch (error) {
    console.error("GET /api/stats/dashboard error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
