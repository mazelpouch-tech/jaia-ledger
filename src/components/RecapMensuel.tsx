"use client";

import { useState, useEffect } from "react";
import { formatMAD } from "@/lib/format";

interface MonthlySummary {
  month: string;
  label: string;
  encaissements: number;
  decaissements: number;
  solde: number;
  marge: number;
}

export default function RecapMensuel() {
  const [data, setData] = useState<MonthlySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch("/api/stats/monthly");
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
    fetchData();
  }, []);

  const totalEnc = data.reduce((s, r) => s + r.encaissements, 0);
  const totalDec = data.reduce((s, r) => s + r.decaissements, 0);
  const soldeCumule = totalEnc - totalDec;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-brown-dark">
          R&eacute;capitulatif Mensuel
        </h1>
        <p className="mt-1 text-sm text-brown">
          Synth&egrave;se mois par mois
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <div className="rounded-xl border border-cream-dark bg-white p-4 sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-brown sm:text-xs">
            Total Encaissements
          </p>
          <p className="mt-2 font-[family-name:var(--font-heading)] text-xl font-bold text-green sm:text-2xl">
            {loading ? "..." : formatMAD(totalEnc)}
          </p>
        </div>
        <div className="rounded-xl border border-cream-dark bg-white p-4 sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-brown sm:text-xs">
            Total D&eacute;caissements
          </p>
          <p className="mt-2 font-[family-name:var(--font-heading)] text-xl font-bold text-red sm:text-2xl">
            {loading ? "..." : formatMAD(totalDec)}
          </p>
        </div>
        <div className="rounded-xl border border-cream-dark bg-white p-4 sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-brown sm:text-xs">
            Solde Cumul&eacute;
          </p>
          <p
            className={`mt-2 font-[family-name:var(--font-heading)] text-xl font-bold sm:text-2xl ${
              soldeCumule >= 0 ? "text-green" : "text-red"
            }`}
          >
            {loading ? "..." : (soldeCumule >= 0 ? "+" : "") + formatMAD(soldeCumule)}
          </p>
        </div>
      </div>

      {/* Monthly Table */}
      {loading ? (
        <p className="py-8 text-center text-sm text-brown">Chargement...</p>
      ) : data.length === 0 ? (
        <p className="rounded-xl border border-cream-dark bg-white py-10 text-center text-sm text-brown">
          Aucune donn&eacute;e disponible
        </p>
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead>
              <tr className="border-b border-cream-dark">
                <th className="pb-3 pr-3 text-xs font-semibold uppercase tracking-wide text-brown">
                  Mois
                </th>
                <th className="pb-3 pr-3 text-right text-xs font-semibold uppercase tracking-wide text-brown">
                  Encaissements
                </th>
                <th className="pb-3 pr-3 text-right text-xs font-semibold uppercase tracking-wide text-brown">
                  D&eacute;caissements
                </th>
                <th className="pb-3 pr-3 text-right text-xs font-semibold uppercase tracking-wide text-brown">
                  Solde
                </th>
                <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wide text-brown">
                  Marge
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => {
                const rowSolde = row.encaissements - row.decaissements;
                const rowMarge =
                  row.encaissements > 0
                    ? ((rowSolde / row.encaissements) * 100)
                    : 0;
                return (
                  <tr
                    key={row.month}
                    className="border-b border-cream-dark last:border-0"
                  >
                    <td className="py-3 pr-3 whitespace-nowrap font-medium text-brown-dark">
                      {row.label ||
                        new Date(row.month + "-01").toLocaleDateString("fr-FR", {
                          month: "long",
                          year: "numeric",
                        })}
                    </td>
                    <td className="py-3 pr-3 whitespace-nowrap text-right font-semibold text-green">
                      {formatMAD(row.encaissements)}
                    </td>
                    <td className="py-3 pr-3 whitespace-nowrap text-right font-semibold text-red">
                      {formatMAD(row.decaissements)}
                    </td>
                    <td
                      className={`py-3 pr-3 whitespace-nowrap text-right font-semibold ${
                        rowSolde >= 0 ? "text-green" : "text-red"
                      }`}
                    >
                      {rowSolde >= 0 ? "+" : ""}
                      {formatMAD(rowSolde)}
                    </td>
                    <td
                      className={`py-3 whitespace-nowrap text-right font-medium ${
                        rowMarge >= 0 ? "text-green" : "text-red"
                      }`}
                    >
                      {rowMarge.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
