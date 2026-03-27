"use client";

import { useState, useEffect } from "react";
import { formatMAD, getMonthKey } from "@/lib/format";

interface StatsData {
  avgRevenuePerDay: number;
  avgExpensePerDay: number;
  revpar: number;
  numRooms: number;
  margin: number;
  encByRoom: { name: string; total: number }[];
  encByCategory: { name: string; total: number }[];
  decByCategory: { name: string; total: number }[];
}

interface YoYData {
  currentEnc: number;
  currentDec: number;
  previousEnc: number;
  previousDec: number;
  currentMonth: string;
  previousMonth: string;
}

interface GuestData {
  topClients: { client: string; totalAmount: number; visitCount: number }[];
  repeatGuests: number;
  totalGuests: number;
}

interface CategoryTrend {
  category: string;
  data: { month: string; total: number }[];
  total: number;
}

interface TrendsData {
  encTrends: CategoryTrend[];
  decTrends: CategoryTrend[];
}

function buildMonthOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    options.push({ value, label });
  }
  return options;
}

export default function Statistique() {
  const [month, setMonth] = useState(getMonthKey());
  const [data, setData] = useState<StatsData | null>(null);
  const [yoyData, setYoyData] = useState<YoYData | null>(null);
  const [guestData, setGuestData] = useState<GuestData | null>(null);
  const [trendsData, setTrendsData] = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(true);

  const monthOptions = buildMonthOptions();

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/stats?month=${month}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/stats/yoy?month=${month}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/stats/guests?month=${month}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/stats/category-trends?months=6`).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([statsData, yoy, guests, trends]) => {
        setData(statsData);
        setYoyData(yoy);
        setGuestData(guests);
        setTrendsData(trends);
      })
      .catch(() => {
        setData(null);
        setYoyData(null);
        setGuestData(null);
        setTrendsData(null);
      })
      .finally(() => setLoading(false));
  }, [month]);

  function pctChange(current: number, previous: number): string {
    if (previous === 0) return current > 0 ? "+100%" : "0%";
    const pct = ((current - previous) / previous) * 100;
    return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
  }

  function changeArrow(current: number, previous: number, invert = false): string {
    const diff = current - previous;
    if (diff === 0) return "";
    const up = invert ? diff < 0 : diff > 0;
    return up ? " \u2191" : " \u2193";
  }

  function changeColor(current: number, previous: number, invert = false): string {
    const diff = current - previous;
    if (diff === 0) return "text-brown";
    const positive = invert ? diff < 0 : diff > 0;
    return positive ? "text-green" : "text-red";
  }

  const maxChambre = data?.encByRoom?.length
    ? Math.max(...data.encByRoom.map((c) => c.total), 1)
    : 1;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-brown-dark">
            Statistiques
          </h1>
          <p className="mt-1 text-sm text-brown">
            Analyses et indicateurs de performance
          </p>
        </div>
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm text-brown-dark focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
        >
          {monthOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="py-12 text-center text-sm text-brown">Chargement...</p>
      ) : !data ? (
        <p className="py-12 text-center text-sm text-brown">Aucune donn&eacute;e disponible</p>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Recette moyenne / jour */}
            <div className="rounded-xl border border-cream-dark bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-brown">
                Recette moyenne / jour
              </p>
              <p className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-bold text-green">
                {formatMAD(data.avgRevenuePerDay ?? 0)}
              </p>
            </div>

            {/* Depense moyenne / jour */}
            <div className="rounded-xl border border-cream-dark bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-brown">
                D&eacute;pense moyenne / jour
              </p>
              <p className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-bold text-red">
                {formatMAD(data.avgExpensePerDay ?? 0)}
              </p>
            </div>

            {/* REVPAR */}
            <div className="rounded-xl border border-cream-dark bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-brown">
                REVPAR ({data.numRooms ?? 9} ch.)
              </p>
              <p className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-bold text-gold">
                {formatMAD(data.revpar ?? 0)}
              </p>
            </div>

            {/* Marge nette */}
            <div className="rounded-xl border border-cream-dark bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-brown">
                Marge nette
              </p>
              <p
                className={`mt-2 font-[family-name:var(--font-heading)] text-2xl font-bold ${
                  (data.margin ?? 0) >= 0 ? "text-green" : "text-red"
                }`}
              >
                {(data.margin ?? 0).toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Year-over-Year Comparison */}
          {yoyData && (
            <div className="rounded-xl border border-cream-dark bg-white p-5">
              <h2 className="mb-4 font-[family-name:var(--font-heading)] text-xl font-semibold text-brown-dark">
                Comparaison annuelle
              </h2>
              <p className="mb-4 text-xs text-brown">
                {yoyData.currentMonth} vs {yoyData.previousMonth}
              </p>

              {/* Encaissements comparison */}
              <div className="mb-4">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium text-brown-dark">Recettes</span>
                  <span className={`text-sm font-semibold ${changeColor(yoyData.currentEnc, yoyData.previousEnc)}`}>
                    {pctChange(yoyData.currentEnc, yoyData.previousEnc)}
                    {changeArrow(yoyData.currentEnc, yoyData.previousEnc)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-brown">
                  <span className="w-20">Actuel</span>
                  <div className="relative h-5 flex-1 overflow-hidden rounded bg-cream">
                    <div
                      className="absolute inset-y-0 left-0 rounded bg-green/70"
                      style={{
                        width: `${Math.max(
                          Math.max(yoyData.currentEnc, yoyData.previousEnc) > 0
                            ? (yoyData.currentEnc / Math.max(yoyData.currentEnc, yoyData.previousEnc)) * 100
                            : 0,
                          2
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="w-28 text-right font-semibold text-brown-dark">{formatMAD(yoyData.currentEnc)}</span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-brown">
                  <span className="w-20">N-1</span>
                  <div className="relative h-5 flex-1 overflow-hidden rounded bg-cream">
                    <div
                      className="absolute inset-y-0 left-0 rounded bg-green/30"
                      style={{
                        width: `${Math.max(
                          Math.max(yoyData.currentEnc, yoyData.previousEnc) > 0
                            ? (yoyData.previousEnc / Math.max(yoyData.currentEnc, yoyData.previousEnc)) * 100
                            : 0,
                          2
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="w-28 text-right font-semibold text-brown-dark">{formatMAD(yoyData.previousEnc)}</span>
                </div>
              </div>

              {/* Decaissements comparison */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium text-brown-dark">D&eacute;penses</span>
                  <span className={`text-sm font-semibold ${changeColor(yoyData.currentDec, yoyData.previousDec, true)}`}>
                    {pctChange(yoyData.currentDec, yoyData.previousDec)}
                    {changeArrow(yoyData.currentDec, yoyData.previousDec, true)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-brown">
                  <span className="w-20">Actuel</span>
                  <div className="relative h-5 flex-1 overflow-hidden rounded bg-cream">
                    <div
                      className="absolute inset-y-0 left-0 rounded bg-red/70"
                      style={{
                        width: `${Math.max(
                          Math.max(yoyData.currentDec, yoyData.previousDec) > 0
                            ? (yoyData.currentDec / Math.max(yoyData.currentDec, yoyData.previousDec)) * 100
                            : 0,
                          2
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="w-28 text-right font-semibold text-brown-dark">{formatMAD(yoyData.currentDec)}</span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-brown">
                  <span className="w-20">N-1</span>
                  <div className="relative h-5 flex-1 overflow-hidden rounded bg-cream">
                    <div
                      className="absolute inset-y-0 left-0 rounded bg-red/30"
                      style={{
                        width: `${Math.max(
                          Math.max(yoyData.currentDec, yoyData.previousDec) > 0
                            ? (yoyData.previousDec / Math.max(yoyData.currentDec, yoyData.previousDec)) * 100
                            : 0,
                          2
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="w-28 text-right font-semibold text-brown-dark">{formatMAD(yoyData.previousDec)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Recettes par chambre */}
          {data.encByRoom && data.encByRoom.length > 0 && (
            <div className="rounded-xl border border-cream-dark bg-white p-5">
              <h2 className="mb-4 font-[family-name:var(--font-heading)] text-xl font-semibold text-brown-dark">
                Recettes par chambre
              </h2>
              <div className="space-y-3">
                {data.encByRoom.map((ch) => (
                  <div key={ch.name} className="flex items-center gap-3">
                    <span className="w-16 shrink-0 text-sm font-medium text-brown-dark">
                      {ch.name}
                    </span>
                    <div className="relative h-7 flex-1 overflow-hidden rounded-md bg-cream">
                      <div
                        className="absolute inset-y-0 left-0 rounded-md bg-gold/80"
                        style={{ width: `${Math.max((ch.total / maxChambre) * 100, 2)}%` }}
                      />
                    </div>
                    <span className="w-28 shrink-0 text-right text-sm font-semibold text-brown-dark">
                      {formatMAD(ch.total)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top categories recettes */}
          {data.encByCategory && data.encByCategory.length > 0 && (
            <div className="rounded-xl border border-cream-dark bg-white p-5">
              <h2 className="mb-4 font-[family-name:var(--font-heading)] text-xl font-semibold text-brown-dark">
                Top cat&eacute;gories recettes
              </h2>
              <div className="space-y-2">
                {data.encByCategory.map((cat, i) => (
                  <div
                    key={cat.name}
                    className="flex items-center justify-between rounded-lg bg-green-light px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green/10 text-xs font-bold text-green">
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium text-brown-dark">{cat.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-green">
                      {formatMAD(cat.total)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top categories depenses */}
          {data.decByCategory && data.decByCategory.length > 0 && (
            <div className="rounded-xl border border-cream-dark bg-white p-5">
              <h2 className="mb-4 font-[family-name:var(--font-heading)] text-xl font-semibold text-brown-dark">
                Top cat&eacute;gories d&eacute;penses
              </h2>
              <div className="space-y-2">
                {data.decByCategory.map((cat, i) => (
                  <div
                    key={cat.name}
                    className="flex items-center justify-between rounded-lg bg-red-light px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red/10 text-xs font-bold text-red">
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium text-brown-dark">{cat.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-red">
                      {formatMAD(cat.total)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Category Trends (6 months) */}
          {trendsData && (trendsData.encTrends.length > 0 || trendsData.decTrends.length > 0) && (
            <div className="rounded-xl border border-cream-dark bg-white p-5">
              <h2 className="mb-4 font-[family-name:var(--font-heading)] text-xl font-semibold text-brown-dark">
                Tendances par cat&eacute;gorie (6 mois)
              </h2>

              {/* Recettes trends */}
              {trendsData.encTrends.length > 0 && (
                <div className="mb-6">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-green">
                    Recettes
                  </h3>
                  <div className="space-y-3">
                    {trendsData.encTrends.slice(0, 5).map((trend) => {
                      const maxVal = Math.max(...trend.data.map((d) => d.total), 1);
                      return (
                        <div key={trend.category}>
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-sm font-medium text-brown-dark">{trend.category}</span>
                            <span className="text-xs font-semibold text-green">{formatMAD(trend.total)}</span>
                          </div>
                          <div className="flex items-end gap-0.5" style={{ height: 32 }}>
                            {trend.data.map((d) => (
                              <div
                                key={d.month}
                                className="flex-1 rounded-t bg-green/60 transition-all"
                                style={{ height: `${Math.max((d.total / maxVal) * 100, 4)}%` }}
                                title={`${d.month}: ${formatMAD(d.total)}`}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Depenses trends */}
              {trendsData.decTrends.length > 0 && (
                <div>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-red">
                    D&eacute;penses
                  </h3>
                  <div className="space-y-3">
                    {trendsData.decTrends.slice(0, 5).map((trend) => {
                      const maxVal = Math.max(...trend.data.map((d) => d.total), 1);
                      return (
                        <div key={trend.category}>
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-sm font-medium text-brown-dark">{trend.category}</span>
                            <span className="text-xs font-semibold text-red">{formatMAD(trend.total)}</span>
                          </div>
                          <div className="flex items-end gap-0.5" style={{ height: 32 }}>
                            {trend.data.map((d) => (
                              <div
                                key={d.month}
                                className="flex-1 rounded-t bg-red/60 transition-all"
                                style={{ height: `${Math.max((d.total / maxVal) * 100, 4)}%` }}
                                title={`${d.month}: ${formatMAD(d.total)}`}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Top Clients */}
          {guestData && guestData.topClients.length > 0 && (
            <div className="rounded-xl border border-cream-dark bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-brown-dark">
                  Top Clients
                </h2>
                {guestData.totalGuests > 0 && (
                  <div className="rounded-lg bg-gold/10 px-3 py-1">
                    <span className="text-xs font-semibold text-gold">
                      {guestData.totalGuests > 0
                        ? `${((guestData.repeatGuests / guestData.totalGuests) * 100).toFixed(0)}%`
                        : "0%"}{" "}
                      clients fid&egrave;les
                    </span>
                    <span className="ml-1 text-xs text-brown">
                      ({guestData.repeatGuests}/{guestData.totalGuests})
                    </span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                {guestData.topClients.map((cl, i) => (
                  <div
                    key={cl.client}
                    className="flex items-center justify-between rounded-lg bg-cream/60 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold/10 text-xs font-bold text-gold">
                        {i + 1}
                      </span>
                      <div>
                        <span className="text-sm font-medium text-brown-dark">{cl.client}</span>
                        <span className="ml-2 text-xs text-brown">
                          {cl.visitCount} visite{cl.visitCount > 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-green">
                      {formatMAD(cl.totalAmount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
