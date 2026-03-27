"use client";

import { useState, useEffect } from "react";
import { formatMAD, getCurrentMonth, getMonthKey, formatDateShort } from "@/lib/format";

interface StatsData {
  totalEncaissements: number;
  totalDecaissements: number;
  prevMonthEncaissements: number;
  prevMonthDecaissements: number;
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: string;
  categoryName: string | null;
}

interface DashboardProps {
  onNavigate?: (page: string) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [recentEncaissements, setRecentEncaissements] = useState<Transaction[]>([]);
  const [recentDecaissements, setRecentDecaissements] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const currentMonth = getCurrentMonth();
  const monthKey = getMonthKey();

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, encRes, decRes] = await Promise.all([
          fetch(`/api/stats?month=${monthKey}`),
          fetch(`/api/encaissements?limit=5`),
          fetch(`/api/decaissements?limit=5`),
        ]);
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }
        if (encRes.ok) {
          const encData = await encRes.json();
          setRecentEncaissements(Array.isArray(encData) ? encData : encData.data ?? []);
        }
        if (decRes.ok) {
          const decData = await decRes.json();
          setRecentDecaissements(Array.isArray(decData) ? decData : decData.data ?? []);
        }
      } catch {
        // silently handle fetch errors
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [monthKey]);

  const navigate = (page: string) => {
    onNavigate?.(page);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-brown-dark">
          Bienvenue, Riad JA&Iuml;A
        </h1>
        <p className="mt-1 text-sm text-brown">
          Tableau de bord &mdash; {currentMonth}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <button
          onClick={() => navigate("Encaissement")}
          className="flex w-full items-center gap-4 rounded-xl bg-green-light px-5 py-4 text-left transition-transform active:scale-[0.98]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green/10 text-xl text-green">
            &darr;
          </span>
          <span className="text-lg font-semibold text-green">Enregistrer recette</span>
        </button>

        <button
          onClick={() => navigate("Décaissement")}
          className="flex w-full items-center gap-4 rounded-xl bg-amber-light px-5 py-4 text-left transition-transform active:scale-[0.98]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red/10 text-xl text-red">
            &uarr;
          </span>
          <span className="text-lg font-semibold text-red">Enregistrer d&eacute;pense</span>
        </button>

        <button
          onClick={() => navigate("Balance")}
          className="flex w-full items-center gap-4 rounded-xl bg-amber-light px-5 py-4 text-left transition-transform active:scale-[0.98]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/10 text-xl text-gold">
            &#9878;
          </span>
          <span className="text-lg font-semibold text-gold">Voir la balance</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-cream-dark bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-brown">
            Encaissements du mois
          </p>
          <p className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-bold text-green">
            {loading ? "..." : formatMAD(stats?.totalEncaissements ?? 0)}
          </p>
          {stats && stats.prevMonthEncaissements > 0 && (
            <p className="mt-1 text-xs text-brown">
              {(() => {
                const variation = ((stats.totalEncaissements - stats.prevMonthEncaissements) / stats.prevMonthEncaissements) * 100;
                return `${variation >= 0 ? "↗" : "↘"} ${Math.abs(variation).toFixed(0)}% vs mois précédent`;
              })()}
            </p>
          )}
        </div>

        <div className="rounded-xl border border-cream-dark bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-brown">
            D&eacute;caissements du mois
          </p>
          <p className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-bold text-red">
            {loading ? "..." : formatMAD(stats?.totalDecaissements ?? 0)}
          </p>
          {stats && stats.prevMonthDecaissements > 0 && (
            <p className="mt-1 text-xs text-brown">
              {(() => {
                const variation = ((stats.totalDecaissements - stats.prevMonthDecaissements) / stats.prevMonthDecaissements) * 100;
                return `${variation >= 0 ? "↗" : "↘"} ${Math.abs(variation).toFixed(0)}% vs mois précédent`;
              })()}
            </p>
          )}
        </div>
      </div>

      {/* Recent Encaissements */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-brown-dark">
            Derniers encaissements
          </h2>
          <button
            onClick={() => navigate("Encaissement")}
            className="text-sm font-medium text-gold hover:underline"
          >
            Voir tout
          </button>
        </div>
        {loading ? (
          <p className="py-4 text-center text-sm text-brown">Chargement...</p>
        ) : recentEncaissements.length === 0 ? (
          <p className="rounded-lg border border-cream-dark bg-white py-6 text-center text-sm text-brown">
            Aucun encaissement ce mois
          </p>
        ) : (
          <div className="space-y-2">
            {recentEncaissements.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between rounded-lg border border-cream-dark bg-white px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-brown-dark">
                    {tx.description}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="text-xs text-brown">
                      {formatDateShort(tx.date)}
                    </span>
                    {tx.categoryName && (
                      <span className="rounded-full bg-green-light px-2 py-0.5 text-[10px] font-medium text-green">
                        {tx.categoryName}
                      </span>
                    )}
                  </div>
                </div>
                <span className="ml-3 whitespace-nowrap text-sm font-semibold text-green">
                  +{formatMAD(parseFloat(tx.amount))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Decaissements */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-brown-dark">
            Derni&egrave;res d&eacute;penses
          </h2>
          <button
            onClick={() => navigate("Décaissement")}
            className="text-sm font-medium text-gold hover:underline"
          >
            Voir tout
          </button>
        </div>
        {loading ? (
          <p className="py-4 text-center text-sm text-brown">Chargement...</p>
        ) : recentDecaissements.length === 0 ? (
          <p className="rounded-lg border border-cream-dark bg-white py-6 text-center text-sm text-brown">
            Aucune d&eacute;pense ce mois
          </p>
        ) : (
          <div className="space-y-2">
            {recentDecaissements.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between rounded-lg border border-cream-dark bg-white px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-brown-dark">
                    {tx.description}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="text-xs text-brown">
                      {formatDateShort(tx.date)}
                    </span>
                    {tx.categoryName && (
                      <span className="rounded-full bg-red-light px-2 py-0.5 text-[10px] font-medium text-red">
                        {tx.categoryName}
                      </span>
                    )}
                  </div>
                </div>
                <span className="ml-3 whitespace-nowrap text-sm font-semibold text-red">
                  -{formatMAD(parseFloat(tx.amount))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
