import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { currencies as currenciesTable } from "@/db/schema";
import { eq } from "drizzle-orm";

interface CacheEntry {
  rate: number;
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours

const DEFAULTS: Record<string, number> = {
  EUR: 10.85,
  USD: 9.95,
  GBP: 12.55,
};

async function syncRateToDb(code: string, rate: number) {
  if (!db) return;
  try {
    const existing = await db
      .select()
      .from(currenciesTable)
      .where(eq(currenciesTable.code, code))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(currenciesTable)
        .set({ rate: String(rate) })
        .where(eq(currenciesTable.code, code));
    } else {
      await db.insert(currenciesTable).values({ code, rate: String(rate) });
    }
  } catch {
    // non-critical, continue
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = (searchParams.get("from") || "EUR").toUpperCase();

    if (from === "MAD") {
      return NextResponse.json({ rate: 1, from: "MAD" });
    }

    // Return cached rate if fresh
    const cached = cache.get(from);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
      return NextResponse.json({ rate: cached.rate, from, cached: true });
    }

    // Fetch from frankfurter.app (free, no API key)
    const res = await fetch(
      `https://api.frankfurter.app/latest?from=${encodeURIComponent(from)}&to=MAD`,
      { next: { revalidate: 14400 } }
    );

    if (!res.ok) {
      const fallbackRate = cached?.rate ?? DEFAULTS[from] ?? 1;
      return NextResponse.json({ rate: fallbackRate, from, fallback: true });
    }

    const data = await res.json();
    const rate = data.rates?.MAD;

    if (!rate || typeof rate !== "number") {
      const fallbackRate = cached?.rate ?? DEFAULTS[from] ?? 1;
      return NextResponse.json({ rate: fallbackRate, from, fallback: true });
    }

    cache.set(from, { rate, fetchedAt: Date.now() });

    // Persist to DB so dashboard uses fresh rates
    await syncRateToDb(from, rate);

    return NextResponse.json({ rate, from, date: data.date });
  } catch {
    const from = "EUR";
    const cached = cache.get(from);
    return NextResponse.json({ rate: cached?.rate ?? DEFAULTS[from] ?? 10.85, from, fallback: true });
  }
}
