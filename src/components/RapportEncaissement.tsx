"use client";

import { useState, useEffect, useMemo } from "react";
import { formatMAD, formatDateShort, getMonthKey } from "@/lib/format";

interface Encaissement {
  id: string;
  date: string;
  reference: string;
  categorie: string;
  description: string;
  client?: string;
  chambre?: string;
  montant: number;
  modeReglement: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  "Hébergement": "bg-green-light text-green",
  "Restaurant": "bg-amber-light text-gold",
  "Spa & Bien-être": "bg-red-light text-red",
  "Activités": "bg-amber-light text-brown",
  "Boutique": "bg-green-light text-brown-dark",
  "Autre": "bg-cream-dark text-brown",
};

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

export default function RapportEncaissement() {
  const monthOptions = useMemo(() => buildMonthOptions(), []);
  const [month, setMonth] = useState(getMonthKey());
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<Encaissement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ month });
        if (category) params.set("category", category);
        if (search) params.set("search", search);
        const res = await fetch(`/api/encaissements?${params}`);
        if (res.ok) {
          const json = await res.json();
          setData(Array.isArray(json) ? json : json.data ?? []);
        }
      } catch {
        // silently handle
      } finally {
        setLoading(false);
      }
    }
    const timeout = setTimeout(fetchData, 300);
    return () => clearTimeout(timeout);
  }, [month, category, search]);

  const total = data.reduce((s, e) => s + e.montant, 0);
  const count = data.length;
  const totalCarte = data
    .filter((e) => e.modeReglement === "Carte bancaire")
    .reduce((s, e) => s + e.montant, 0);
  const totalEspeces = data
    .filter((e) => e.modeReglement === "Espèces")
    .reduce((s, e) => s + e.montant, 0);

  const categories = useMemo(() => {
    const set = new Set(data.map((e) => e.categorie).filter(Boolean));
    return Array.from(set).sort();
  }, [data]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-brown-dark">
          Rapport Encaissement
        </h1>
        <p className="mt-1 text-sm text-brown">
          D&eacute;tail de toutes les recettes
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher..."
          className="flex-1 rounded-lg border border-cream-dark bg-white px-3 py-2.5 text-sm text-brown-dark outline-none focus:border-gold focus:ring-1 focus:ring-gold"
        />
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-lg border border-cream-dark bg-white px-3 py-2.5 text-sm text-brown-dark outline-none focus:border-gold focus:ring-1 focus:ring-gold"
        >
          {monthOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-cream-dark bg-white px-3 py-2.5 text-sm text-brown-dark outline-none focus:border-gold focus:ring-1 focus:ring-gold"
        >
          <option value="">Toutes cat&eacute;gories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="rounded-xl border border-cream-dark bg-white p-4 sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-brown sm:text-xs">
            Total Encaissements
          </p>
          <p className="mt-2 font-[family-name:var(--font-heading)] text-xl font-bold text-green sm:text-2xl">
            {loading ? "..." : formatMAD(total)}
          </p>
        </div>
        <div className="rounded-xl border border-cream-dark bg-white p-4 sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-brown sm:text-xs">
            Nombre d&apos;&eacute;critures
          </p>
          <p className="mt-2 font-[family-name:var(--font-heading)] text-xl font-bold text-brown-dark sm:text-2xl">
            {loading ? "..." : count}
          </p>
        </div>
        <div className="rounded-xl border border-cream-dark bg-white p-4 sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-brown sm:text-xs">
            Carte Bancaire
          </p>
          <p className="mt-2 font-[family-name:var(--font-heading)] text-xl font-bold text-brown-dark sm:text-2xl">
            {loading ? "..." : formatMAD(totalCarte)}
          </p>
        </div>
        <div className="rounded-xl border border-cream-dark bg-white p-4 sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-brown sm:text-xs">
            Esp&egrave;ces
          </p>
          <p className="mt-2 font-[family-name:var(--font-heading)] text-xl font-bold text-brown-dark sm:text-2xl">
            {loading ? "..." : formatMAD(totalEspeces)}
          </p>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <p className="py-8 text-center text-sm text-brown">Chargement...</p>
      ) : data.length === 0 ? (
        <p className="rounded-xl border border-cream-dark bg-white py-10 text-center text-sm text-brown">
          Aucun encaissement trouv&eacute;
        </p>
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-cream-dark">
                <th className="pb-3 pr-3 text-xs font-semibold uppercase tracking-wide text-brown">
                  Date
                </th>
                <th className="pb-3 pr-3 text-xs font-semibold uppercase tracking-wide text-brown">
                  R&eacute;f.
                </th>
                <th className="pb-3 pr-3 text-xs font-semibold uppercase tracking-wide text-brown">
                  Cat&eacute;gorie
                </th>
                <th className="pb-3 pr-3 text-xs font-semibold uppercase tracking-wide text-brown">
                  Description
                </th>
                <th className="pb-3 pr-3 text-xs font-semibold uppercase tracking-wide text-brown">
                  Client
                </th>
                <th className="pb-3 pr-3 text-xs font-semibold uppercase tracking-wide text-brown">
                  Chambre
                </th>
                <th className="pb-3 pr-3 text-right text-xs font-semibold uppercase tracking-wide text-brown">
                  Montant
                </th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wide text-brown">
                  Mode
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-cream-dark last:border-0"
                >
                  <td className="py-3 pr-3 whitespace-nowrap text-brown-dark">
                    {formatDateShort(row.date)}
                  </td>
                  <td className="py-3 pr-3 whitespace-nowrap text-brown">
                    {row.reference}
                  </td>
                  <td className="py-3 pr-3 whitespace-nowrap">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                        CATEGORY_COLORS[row.categorie] ?? "bg-cream-dark text-brown"
                      }`}
                    >
                      {row.categorie}
                    </span>
                  </td>
                  <td className="py-3 pr-3 max-w-[200px] truncate text-brown-dark">
                    {row.description}
                  </td>
                  <td className="py-3 pr-3 whitespace-nowrap text-brown">
                    {row.client || "\u2014"}
                  </td>
                  <td className="py-3 pr-3 whitespace-nowrap text-brown">
                    {row.chambre || "\u2014"}
                  </td>
                  <td className="py-3 pr-3 whitespace-nowrap text-right font-semibold text-green">
                    {formatMAD(row.montant)}
                  </td>
                  <td className="py-3 whitespace-nowrap text-brown">
                    {row.modeReglement}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
