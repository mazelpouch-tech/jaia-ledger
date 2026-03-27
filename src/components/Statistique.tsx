"use client";

import { useState, useEffect } from "react";
import { formatMAD, getMonthKey } from "@/lib/format";

interface StatsData {
  recetteMoyenneJour: number;
  depenseMoyenneJour: number;
  revpar: number;
  margeNette: number;
  recettesParChambre: { chambre: string; montant: number }[];
  topCategoriesRecettes: { categorie: string; montant: number }[];
  topCategoriesDepenses: { categorie: string; montant: number }[];
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
  const [loading, setLoading] = useState(true);

  const monthOptions = buildMonthOptions();

  useEffect(() => {
    setLoading(true);
    fetch(`/api/stats?month=${month}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [month]);

  const maxChambre = data?.recettesParChambre?.length
    ? Math.max(...data.recettesParChambre.map((c) => c.montant), 1)
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
                {formatMAD(data.recetteMoyenneJour ?? 0)}
              </p>
            </div>

            {/* Depense moyenne / jour */}
            <div className="rounded-xl border border-cream-dark bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-brown">
                D&eacute;pense moyenne / jour
              </p>
              <p className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-bold text-red">
                {formatMAD(data.depenseMoyenneJour ?? 0)}
              </p>
            </div>

            {/* REVPAR */}
            <div className="rounded-xl border border-cream-dark bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-brown">
                REVPAR (9 ch.)
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
                  (data.margeNette ?? 0) >= 0 ? "text-green" : "text-red"
                }`}
              >
                {(data.margeNette ?? 0).toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Recettes par chambre */}
          {data.recettesParChambre && data.recettesParChambre.length > 0 && (
            <div className="rounded-xl border border-cream-dark bg-white p-5">
              <h2 className="mb-4 font-[family-name:var(--font-heading)] text-xl font-semibold text-brown-dark">
                Recettes par chambre
              </h2>
              <div className="space-y-3">
                {data.recettesParChambre.map((ch) => (
                  <div key={ch.chambre} className="flex items-center gap-3">
                    <span className="w-16 shrink-0 text-sm font-medium text-brown-dark">
                      {ch.chambre}
                    </span>
                    <div className="relative h-7 flex-1 overflow-hidden rounded-md bg-cream">
                      <div
                        className="absolute inset-y-0 left-0 rounded-md bg-gold/80"
                        style={{ width: `${Math.max((ch.montant / maxChambre) * 100, 2)}%` }}
                      />
                    </div>
                    <span className="w-28 shrink-0 text-right text-sm font-semibold text-brown-dark">
                      {formatMAD(ch.montant)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top categories recettes */}
          {data.topCategoriesRecettes && data.topCategoriesRecettes.length > 0 && (
            <div className="rounded-xl border border-cream-dark bg-white p-5">
              <h2 className="mb-4 font-[family-name:var(--font-heading)] text-xl font-semibold text-brown-dark">
                Top cat&eacute;gories recettes
              </h2>
              <div className="space-y-2">
                {data.topCategoriesRecettes.map((cat, i) => (
                  <div
                    key={cat.categorie}
                    className="flex items-center justify-between rounded-lg bg-green-light px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green/10 text-xs font-bold text-green">
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium text-brown-dark">{cat.categorie}</span>
                    </div>
                    <span className="text-sm font-semibold text-green">
                      {formatMAD(cat.montant)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top categories depenses */}
          {data.topCategoriesDepenses && data.topCategoriesDepenses.length > 0 && (
            <div className="rounded-xl border border-cream-dark bg-white p-5">
              <h2 className="mb-4 font-[family-name:var(--font-heading)] text-xl font-semibold text-brown-dark">
                Top cat&eacute;gories d&eacute;penses
              </h2>
              <div className="space-y-2">
                {data.topCategoriesDepenses.map((cat, i) => (
                  <div
                    key={cat.categorie}
                    className="flex items-center justify-between rounded-lg bg-red-light px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red/10 text-xs font-bold text-red">
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium text-brown-dark">{cat.categorie}</span>
                    </div>
                    <span className="text-sm font-semibold text-red">
                      {formatMAD(cat.montant)}
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
