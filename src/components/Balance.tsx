"use client";

import { useState, useEffect, useMemo } from "react";
import { formatMAD, getMonthKey } from "@/lib/format";

interface CategoryBreakdown {
  categorie: string;
  total: number;
}

interface StatsData {
  totalEncaissements: number;
  totalDecaissements: number;
  countEncaissements: number;
  countDecaissements: number;
  encaissementsByCategory?: CategoryBreakdown[];
  decaissementsByCategory?: CategoryBreakdown[];
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

export default function Balance() {
  const monthOptions = useMemo(() => buildMonthOptions(), []);
  const [month, setMonth] = useState(getMonthKey());
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/stats?month=${month}`);
        if (res.ok) {
          const json = await res.json();
          setStats(json);
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
  const marge = totalEnc > 0 ? ((solde / totalEnc) * 100) : 0;
  const countEnc = stats?.countEncaissements ?? 0;
  const countDec = stats?.countDecaissements ?? 0;

  const encByCategory = stats?.encaissementsByCategory ?? [];
  const decByCategory = stats?.decaissementsByCategory ?? [];
  const maxEncCategory = encByCategory.length > 0
    ? Math.max(...encByCategory.map((c) => c.total))
    : 0;
  const maxDecCategory = decByCategory.length > 0
    ? Math.max(...decByCategory.map((c) => c.total))
    : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-brown-dark">
          Balance
        </h1>
        <p className="mt-1 text-sm text-brown">
          Synth&egrave;se encaissements vs d&eacute;caissements
        </p>
      </div>

      {/* Month Selector */}
      <div>
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="w-full rounded-lg border border-cream-dark bg-white px-3 py-2.5 text-sm text-brown-dark outline-none focus:border-gold focus:ring-1 focus:ring-gold sm:w-auto"
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
          {/* Big Balance Card */}
          <div className="rounded-xl border border-cream-dark bg-white p-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              {/* Encaissements */}
              <div className="text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-brown">
                  &#x1F4C8; Encaissements
                </p>
                <p className="mt-3 font-[family-name:var(--font-heading)] text-2xl font-bold text-green sm:text-3xl">
                  {formatMAD(totalEnc)}
                </p>
                <p className="mt-1 text-xs text-brown">
                  {countEnc} &eacute;criture{countEnc !== 1 ? "s" : ""}
                </p>
              </div>

              {/* Solde */}
              <div className="flex flex-col items-center justify-center rounded-xl bg-cream p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-brown">
                  &#x2696; Solde
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
                  &#x1F4C9; D&eacute;caissements
                </p>
                <p className="mt-3 font-[family-name:var(--font-heading)] text-2xl font-bold text-red sm:text-3xl">
                  {formatMAD(totalDec)}
                </p>
                <p className="mt-1 text-xs text-brown">
                  {countDec} &eacute;criture{countDec !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </div>

          {/* Category Breakdowns */}
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
                  {encByCategory.map((cat) => (
                    <div key={cat.categorie}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="text-brown-dark">{cat.categorie}</span>
                        <span className="font-semibold text-green">
                          {formatMAD(cat.total)}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-cream-dark">
                        <div
                          className="h-full rounded-full bg-green"
                          style={{
                            width: `${maxEncCategory > 0 ? (cat.total / maxEncCategory) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
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
                  {decByCategory.map((cat) => (
                    <div key={cat.categorie}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="text-brown-dark">{cat.categorie}</span>
                        <span className="font-semibold text-red">
                          {formatMAD(cat.total)}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-cream-dark">
                        <div
                          className="h-full rounded-full bg-red"
                          style={{
                            width: `${maxDecCategory > 0 ? (cat.total / maxDecCategory) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
