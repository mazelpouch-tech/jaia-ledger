"use client";

import { useState, useEffect, useMemo } from "react";
import { formatMAD, getMonthKey } from "@/lib/format";

interface CategoryBreakdown {
  name: string;
  total: number;
}

interface StatsData {
  totalEncaissements: number;
  totalDecaissements: number;
  countEncaissements: number;
  countDecaissements: number;
  prevMonthEncaissements: number;
  prevMonthDecaissements: number;
  encByCategory: CategoryBreakdown[];
  decByCategory: CategoryBreakdown[];
}

interface DailyEntry {
  day: string;
  dayLabel: number;
  enc: number;
  dec: number;
  runningBalance: number;
}

interface MethodBreakdown {
  method: string;
  total: number;
}

interface DailyData {
  daily: DailyEntry[];
  encByMethod: MethodBreakdown[];
  decByMethod: MethodBreakdown[];
}

interface MonthlyEntry {
  month: string;
  monthLabel: string;
  totalEnc: number;
  totalDec: number;
  solde: number;
}

function buildMonthOptions(): { label: string; value: string }[] {
  const options: { label: string; value: string }[] = [];
  const now = new Date();
  for (let i = 0; i <= 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = getMonthKey(d);
    const label = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    options.push({ label: label.charAt(0).toUpperCase() + label.slice(1), value });
  }
  return options;
}

function formatVariation(current: number, previous: number): { text: string; positive: boolean | null } {
  if (previous === 0) return { text: "—", positive: null };
  const pct = ((current - previous) / previous) * 100;
  const sign = pct >= 0 ? "+" : "";
  return { text: `${sign}${pct.toFixed(1)}%`, positive: pct >= 0 };
}

const METHOD_COLORS: Record<string, string> = {
  "Espèces": "#c4973b",
  "Carte bancaire": "#0d7c4a",
  "Virement": "#5c4a32",
  "Chèque": "#d4ab5a",
};

function DonutChart({ data, total }: { data: MethodBreakdown[]; total: number }) {
  if (data.length === 0 || total === 0) {
    return <p className="py-6 text-center text-xs text-brown">Aucune donn&eacute;e</p>;
  }

  let cumulative = 0;
  const segments = data.map((d) => {
    const pct = (d.total / total) * 100;
    const start = cumulative;
    cumulative += pct;
    return { ...d, pct, start };
  });

  // Build conic-gradient
  const stops = segments
    .map((s) => {
      const color = METHOD_COLORS[s.method] || "#f0e9df";
      return `${color} ${s.start}% ${s.start + s.pct}%`;
    })
    .join(", ");

  return (
    <div className="flex items-center gap-4">
      <div
        className="h-24 w-24 shrink-0 rounded-full"
        style={{
          background: `conic-gradient(${stops})`,
          mask: "radial-gradient(circle at center, transparent 55%, black 56%)",
          WebkitMask: "radial-gradient(circle at center, transparent 55%, black 56%)",
        }}
      />
      <div className="space-y-1.5">
        {segments.map((s) => (
          <div key={s.method} className="flex items-center gap-2 text-xs">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: METHOD_COLORS[s.method] || "#f0e9df" }}
            />
            <span className="text-brown-dark">{s.method}</span>
            <span className="font-semibold text-brown">{s.pct.toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DailyChart({ data }: { data: DailyEntry[] }) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-xs text-brown">Aucune donn&eacute;e journali&egrave;re</p>;
  }

  const maxVal = Math.max(...data.map((d) => Math.max(d.enc, d.dec)), 1);
  const minBalance = Math.min(...data.map((d) => d.runningBalance), 0);
  const maxBalance = Math.max(...data.map((d) => d.runningBalance), 1);
  const balanceRange = maxBalance - minBalance || 1;

  return (
    <div className="space-y-4">
      {/* Revenue vs Expense bars */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brown">
          Recettes vs D&eacute;penses par jour
        </p>
        <div className="flex items-end gap-0.5" style={{ height: "120px" }}>
          {data.map((d) => (
            <div key={d.day} className="group relative flex flex-1 flex-col items-center justify-end gap-0.5" style={{ height: "100%" }}>
              {/* Revenue bar */}
              <div
                className="w-full rounded-t-sm bg-green transition-all hover:bg-green/80"
                style={{ height: `${Math.max((d.enc / maxVal) * 100, 1)}%`, minHeight: d.enc > 0 ? "2px" : "0" }}
                title={`${d.dayLabel}: +${formatMAD(d.enc)}`}
              />
              {/* Expense bar */}
              <div
                className="w-full rounded-b-sm bg-red transition-all hover:bg-red/80"
                style={{ height: `${Math.max((d.dec / maxVal) * 100, 1)}%`, minHeight: d.dec > 0 ? "2px" : "0" }}
                title={`${d.dayLabel}: -${formatMAD(d.dec)}`}
              />
              {/* Day label (show every few days) */}
              {(d.dayLabel === 1 || d.dayLabel % 5 === 0 || d.dayLabel === data[data.length - 1].dayLabel) && (
                <span className="absolute -bottom-4 text-[8px] text-brown">{d.dayLabel}</span>
              )}
            </div>
          ))}
        </div>
        <div className="mt-5 flex items-center gap-4 text-[10px] text-brown">
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm bg-green" /> Recettes</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm bg-red" /> D&eacute;penses</span>
        </div>
      </div>

      {/* Running balance line */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brown">
          Solde cumulatif
        </p>
        <svg viewBox={`0 0 ${data.length * 20} 80`} className="h-20 w-full" preserveAspectRatio="none">
          {/* Zero line */}
          {minBalance < 0 && (
            <line
              x1="0"
              y1={80 - ((0 - minBalance) / balanceRange) * 80}
              x2={data.length * 20}
              y2={80 - ((0 - minBalance) / balanceRange) * 80}
              stroke="#f0e9df"
              strokeWidth="1"
              strokeDasharray="4,3"
            />
          )}
          {/* Balance line */}
          <polyline
            fill="none"
            stroke="#c4973b"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={data
              .map((d, i) => {
                const x = i * 20 + 10;
                const y = 80 - ((d.runningBalance - minBalance) / balanceRange) * 76 - 2;
                return `${x},${y}`;
              })
              .join(" ")}
          />
          {/* Area fill */}
          <polygon
            fill="url(#balanceGradient)"
            opacity="0.15"
            points={`${10},${80} ${data
              .map((d, i) => {
                const x = i * 20 + 10;
                const y = 80 - ((d.runningBalance - minBalance) / balanceRange) * 76 - 2;
                return `${x},${y}`;
              })
              .join(" ")} ${(data.length - 1) * 20 + 10},${80}`}
          />
          {/* Dots */}
          {data.map((d, i) => {
            const x = i * 20 + 10;
            const y = 80 - ((d.runningBalance - minBalance) / balanceRange) * 76 - 2;
            return (
              <circle key={d.day} cx={x} cy={y} r="2.5" fill="#c4973b">
                <title>{`Jour ${d.dayLabel}: ${formatMAD(d.runningBalance)}`}</title>
              </circle>
            );
          })}
          <defs>
            <linearGradient id="balanceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#c4973b" />
              <stop offset="100%" stopColor="#faf6f1" />
            </linearGradient>
          </defs>
        </svg>
        <div className="flex justify-between text-[9px] text-brown">
          <span>D&eacute;but</span>
          <span>{formatMAD(data[data.length - 1]?.runningBalance ?? 0)}</span>
        </div>
      </div>
    </div>
  );
}

function TrendSparkline({ data }: { data: MonthlyEntry[] }) {
  const last6 = data.slice(0, 6).reverse();
  if (last6.length < 2) return null;

  const maxSolde = Math.max(...last6.map((d) => Math.abs(d.solde)), 1);

  return (
    <div className="rounded-xl border border-cream-dark bg-white p-5">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-brown">
        Tendance des 6 derniers mois
      </h3>
      <div className="flex items-end gap-2" style={{ height: "80px" }}>
        {last6.map((m) => {
          const height = Math.max((Math.abs(m.solde) / maxSolde) * 100, 4);
          const positive = m.solde >= 0;
          return (
            <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
              <span className={`text-[9px] font-semibold ${positive ? "text-green" : "text-red"}`}>
                {positive ? "+" : ""}{formatMAD(m.solde)}
              </span>
              <div
                className={`w-full rounded-t-md ${positive ? "bg-green" : "bg-red"}`}
                style={{ height: `${height}%`, minHeight: "4px" }}
              />
              <span className="text-[8px] text-brown">
                {m.monthLabel.split(" ")[0]?.slice(0, 3)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Balance() {
  const monthOptions = useMemo(() => buildMonthOptions(), []);
  const [month, setMonth] = useState(getMonthKey());
  const [stats, setStats] = useState<StatsData | null>(null);
  const [dailyData, setDailyData] = useState<DailyData | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [statsRes, dailyRes, monthlyRes] = await Promise.all([
          fetch(`/api/stats?month=${month}`),
          fetch(`/api/stats/daily?month=${month}`),
          fetch("/api/stats/monthly"),
        ]);

        if (statsRes.ok) setStats(await statsRes.json());
        if (dailyRes.ok) setDailyData(await dailyRes.json());
        if (monthlyRes.ok) {
          const mData = await monthlyRes.json();
          setMonthlyData(Array.isArray(mData) ? mData : []);
        }
      } catch {
        // silently handle
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [month]);

  const totalEnc = stats?.totalEncaissements ?? 0;
  const totalDec = stats?.totalDecaissements ?? 0;
  const solde = totalEnc - totalDec;
  const marge = totalEnc > 0 ? (solde / totalEnc) * 100 : 0;
  const countEnc = stats?.countEncaissements ?? 0;
  const countDec = stats?.countDecaissements ?? 0;

  const prevEnc = stats?.prevMonthEncaissements ?? 0;
  const prevDec = stats?.prevMonthDecaissements ?? 0;
  const encVariation = formatVariation(totalEnc, prevEnc);
  const decVariation = formatVariation(totalDec, prevDec);

  // Unified scale for category bars — honest comparison
  const encByCategory = stats?.encByCategory ?? [];
  const decByCategory = stats?.decByCategory ?? [];
  const globalMaxCategory = Math.max(
    ...encByCategory.map((c) => c.total),
    ...decByCategory.map((c) => c.total),
    1
  );

  // Proportional bar
  const grandTotal = totalEnc + totalDec;
  const encPct = grandTotal > 0 ? (totalEnc / grandTotal) * 100 : 50;

  // Payment methods
  const encTotal = dailyData?.encByMethod?.reduce((s, m) => s + m.total, 0) ?? 0;
  const decMethodTotal = dailyData?.decByMethod?.reduce((s, m) => s + m.total, 0) ?? 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-brown-dark">
            Balance
          </h1>
          <p className="mt-1 text-sm text-brown">
            Synth&egrave;se encaissements vs d&eacute;caissements
          </p>
        </div>
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-lg border border-cream-dark bg-white px-3 py-2.5 text-sm text-brown-dark outline-none focus:border-gold focus:ring-1 focus:ring-gold sm:w-auto"
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
      ) : (
        <>
          {/* Proportional Bar */}
          <div className="rounded-xl border border-cream-dark bg-white p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-brown">
              Ratio Recettes / D&eacute;penses
            </p>
            <div className="flex h-6 w-full overflow-hidden rounded-full bg-cream-dark">
              <div
                className="flex items-center justify-center rounded-l-full bg-green text-[10px] font-bold text-white transition-all duration-500"
                style={{ width: `${encPct}%`, minWidth: grandTotal > 0 ? "20px" : "0" }}
              >
                {grandTotal > 0 && encPct > 15 ? `${encPct.toFixed(0)}%` : ""}
              </div>
              <div
                className="flex items-center justify-center rounded-r-full bg-red text-[10px] font-bold text-white transition-all duration-500"
                style={{ width: `${100 - encPct}%`, minWidth: grandTotal > 0 ? "20px" : "0" }}
              >
                {grandTotal > 0 && (100 - encPct) > 15 ? `${(100 - encPct).toFixed(0)}%` : ""}
              </div>
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-brown">
              <span>Recettes: {formatMAD(totalEnc)}</span>
              <span>D&eacute;penses: {formatMAD(totalDec)}</span>
            </div>
          </div>

          {/* Big Balance Cards with Month-over-Month */}
          <div className="rounded-xl border border-cream-dark bg-white p-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              {/* Encaissements */}
              <div className="text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-brown">
                  Encaissements
                </p>
                <p className="mt-3 font-[family-name:var(--font-heading)] text-2xl font-bold text-green sm:text-3xl">
                  {formatMAD(totalEnc)}
                </p>
                <p className="mt-1 text-xs text-brown">
                  {countEnc} &eacute;criture{countEnc !== 1 ? "s" : ""}
                </p>
                {encVariation.positive !== null && (
                  <p className={`mt-1 text-xs font-semibold ${encVariation.positive ? "text-green" : "text-red"}`}>
                    {encVariation.positive ? "\u25B2" : "\u25BC"} {encVariation.text} vs mois pr&eacute;c.
                  </p>
                )}
              </div>

              {/* Solde */}
              <div className="flex flex-col items-center justify-center rounded-xl bg-cream p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-brown">
                  Solde
                </p>
                <p
                  className={`mt-3 font-[family-name:var(--font-heading)] text-2xl font-bold sm:text-3xl ${
                    solde >= 0 ? "text-green" : "text-red"
                  }`}
                >
                  {solde >= 0 ? "+" : ""}
                  {formatMAD(solde)}
                </p>
                <p className="mt-1 text-xs text-brown">
                  Marge&nbsp;: {marge.toFixed(1)}%
                </p>
              </div>

              {/* Decaissements */}
              <div className="text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-brown">
                  D&eacute;caissements
                </p>
                <p className="mt-3 font-[family-name:var(--font-heading)] text-2xl font-bold text-red sm:text-3xl">
                  {formatMAD(totalDec)}
                </p>
                <p className="mt-1 text-xs text-brown">
                  {countDec} &eacute;criture{countDec !== 1 ? "s" : ""}
                </p>
                {decVariation.positive !== null && (
                  <p className={`mt-1 text-xs font-semibold ${decVariation.positive ? "text-red" : "text-green"}`}>
                    {decVariation.positive ? "\u25B2" : "\u25BC"} {decVariation.text} vs mois pr&eacute;c.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Daily Chart */}
          {dailyData && dailyData.daily.length > 0 && (
            <div className="rounded-xl border border-cream-dark bg-white p-5">
              <DailyChart data={dailyData.daily} />
            </div>
          )}

          {/* Payment Method Donut Charts */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-cream-dark bg-white p-5">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-brown">
                Recettes par mode de paiement
              </h3>
              <DonutChart data={dailyData?.encByMethod ?? []} total={encTotal} />
            </div>
            <div className="rounded-xl border border-cream-dark bg-white p-5">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-brown">
                D&eacute;penses par mode de paiement
              </h3>
              <DonutChart data={dailyData?.decByMethod ?? []} total={decMethodTotal} />
            </div>
          </div>

          {/* Category Breakdowns — unified scale */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Encaissements by Category */}
            <div className="rounded-xl border border-cream-dark bg-white p-5">
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-brown">
                Encaissements par cat&eacute;gorie
              </h3>
              {encByCategory.length === 0 ? (
                <p className="py-4 text-center text-xs text-brown">Aucune donn&eacute;e</p>
              ) : (
                <div className="space-y-3">
                  {encByCategory.map((cat) => {
                    const pct = totalEnc > 0 ? (cat.total / totalEnc) * 100 : 0;
                    return (
                      <div key={cat.name}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="text-brown-dark">{cat.name}</span>
                          <span className="flex items-center gap-2">
                            <span className="text-[10px] text-brown">{pct.toFixed(0)}%</span>
                            <span className="font-semibold text-green">{formatMAD(cat.total)}</span>
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-cream-dark">
                          <div
                            className="h-full rounded-full bg-green transition-all duration-300"
                            style={{ width: `${(cat.total / globalMaxCategory) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Decaissements by Category */}
            <div className="rounded-xl border border-cream-dark bg-white p-5">
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-brown">
                D&eacute;caissements par cat&eacute;gorie
              </h3>
              {decByCategory.length === 0 ? (
                <p className="py-4 text-center text-xs text-brown">Aucune donn&eacute;e</p>
              ) : (
                <div className="space-y-3">
                  {decByCategory.map((cat) => {
                    const pct = totalDec > 0 ? (cat.total / totalDec) * 100 : 0;
                    return (
                      <div key={cat.name}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="text-brown-dark">{cat.name}</span>
                          <span className="flex items-center gap-2">
                            <span className="text-[10px] text-brown">{pct.toFixed(0)}%</span>
                            <span className="font-semibold text-red">{formatMAD(cat.total)}</span>
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-cream-dark">
                          <div
                            className="h-full rounded-full bg-red transition-all duration-300"
                            style={{ width: `${(cat.total / globalMaxCategory) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 6-Month Trend */}
          {monthlyData.length >= 2 && <TrendSparkline data={monthlyData} />}

          {/* Cash Flow Forecast */}
          {monthlyData.length >= 1 && (() => {
            const avgEnc = monthlyData.reduce((s, m) => s + m.totalEnc, 0) / monthlyData.length;
            const avgDec = monthlyData.reduce((s, m) => s + m.totalDec, 0) / monthlyData.length;
            const avgSolde = avgEnc - avgDec;

            const now = new Date();
            const projected = Array.from({ length: 3 }, (_, i) => {
              const d = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
              const label = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
              return {
                label: label.charAt(0).toUpperCase() + label.slice(1),
                enc: avgEnc,
                dec: avgDec,
                solde: avgSolde,
              };
            });

            return (
              <div className="rounded-xl border border-cream-dark bg-white p-5">
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-brown">
                  Pr&eacute;vision de tr&eacute;sorerie (3 mois)
                </h3>
                <p className="mb-4 text-[10px] text-brown">
                  Bas&eacute;e sur la moyenne de {monthlyData.length} mois d&apos;historique
                </p>
                <div className="-mx-2 overflow-x-auto px-2 sm:mx-0 sm:px-0">
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-cream-dark">
                        <th className="pb-3 pr-3 text-xs font-semibold uppercase tracking-wide text-brown">Mois</th>
                        <th className="pb-3 pr-3 text-right text-xs font-semibold uppercase tracking-wide text-brown">Enc. pr&eacute;vus</th>
                        <th className="pb-3 pr-3 text-right text-xs font-semibold uppercase tracking-wide text-brown">D&eacute;c. pr&eacute;vus</th>
                        <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wide text-brown">Solde pr&eacute;vu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projected.map((p) => (
                        <tr key={p.label} className="border-b border-cream-dark last:border-0">
                          <td className="py-3 pr-3 whitespace-nowrap font-medium text-brown-dark">{p.label}</td>
                          <td className="py-3 pr-3 whitespace-nowrap text-right font-semibold text-green">{formatMAD(p.enc)}</td>
                          <td className="py-3 pr-3 whitespace-nowrap text-right font-semibold text-red">{formatMAD(p.dec)}</td>
                          <td className={`py-3 whitespace-nowrap text-right font-semibold ${p.solde >= 0 ? "text-green" : "text-red"}`}>
                            {p.solde >= 0 ? "+" : ""}{formatMAD(p.solde)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}
