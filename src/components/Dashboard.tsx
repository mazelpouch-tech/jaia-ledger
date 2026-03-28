"use client";

import { useState, useEffect, useMemo } from "react";
import { formatMAD, getMonthKey } from "@/lib/format";

interface MethodTotal {
  method: string;
  total: number;
}

interface CurrencyTotal {
  currency: string;
  total: number;
}

interface CurrencyRate {
  code: string;
  rate: number;
}

interface DashboardData {
  encByMethod: MethodTotal[];
  decByMethod: MethodTotal[];
  totalEncaissements: number;
  totalDecaissements: number;
  encByCurrency: CurrencyTotal[];
  decByCurrency: CurrencyTotal[];
  currencyRates: CurrencyRate[];
}

interface DashboardProps {
  onNavigate?: (page: string) => void;
}

const METHOD_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  "Espèces": {
    label: "ESPECES",
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/></svg>,
    color: "text-gold",
  },
  "Carte bancaire": {
    label: "CARTE",
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
    color: "text-gold",
  },
  "Virement": {
    label: "VIREMENT",
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 010-4h14v4"/><path d="M3 5v14a2 2 0 002 2h16v-5"/><path d="M18 12a2 2 0 000 4h4v-4z"/></svg>,
    color: "text-gold",
  },
  "Chèque": {
    label: "CHEQUE",
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    color: "text-gold",
  },
};

const ALL_METHODS = ["Espèces", "Carte bancaire", "Virement", "Chèque"];

function formatFrenchDateRange(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date();
  const startStr = start.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  const endStr = end.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  return `${startStr} \u2014 ${endStr}`;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const monthKey = getMonthKey();

  useEffect(() => {
    fetch(`/api/stats/dashboard?month=${monthKey}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [monthKey]);

  const navigate = (page: string) => onNavigate?.(page);

  const methodTotals = useMemo(() => {
    if (!data) return ALL_METHODS.map((m) => ({ method: m, total: 0 }));
    return ALL_METHODS.map((method) => ({
      method,
      total: data.encByMethod.find((e) => e.method === method)?.total ?? 0,
    }));
  }, [data]);

  // Cash balance: income cash - expense cash
  const cashBalance = useMemo(() => {
    if (!data) return { encCash: 0, decCash: 0, balance: 0 };
    const encCash = data.encByMethod.find((e) => e.method === "Espèces")?.total ?? 0;
    const decCash = data.decByMethod.find((e) => e.method === "Espèces")?.total ?? 0;
    return { encCash, decCash, balance: encCash - decCash };
  }, [data]);

  // Net currency breakdown (enc - dec per currency)
  const currencyBreakdown = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, number>();
    for (const e of data.encByCurrency) {
      map.set(e.currency || "MAD", (map.get(e.currency || "MAD") ?? 0) + e.total);
    }
    for (const d of data.decByCurrency) {
      map.set(d.currency || "MAD", (map.get(d.currency || "MAD") ?? 0) - d.total);
    }
    const rateMap = new Map(data.currencyRates.map((r) => [r.code, r.rate]));
    return Array.from(map.entries()).map(([currency, total]) => ({
      currency,
      total,
      madEquivalent: currency === "MAD" ? total : total * (rateMap.get(currency) ?? 1),
    }));
  }, [data]);

  const totalEnc = data?.totalEncaissements ?? 0;
  const totalDec = data?.totalDecaissements ?? 0;
  const fluxNet = totalEnc - totalDec;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Cumulative header */}
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-main-muted">
          Encaissements Cumulatifs
        </h2>
        <span className="rounded-full bg-green/10 px-3 py-0.5 text-xs font-medium text-green">
          {formatFrenchDateRange(monthKey)}
        </span>
      </div>

      {/* Payment method cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {methodTotals.map(({ method, total }) => {
          const config = METHOD_CONFIG[method] ?? { label: method.toUpperCase(), icon: null, color: "text-accent" };
          return (
            <div
              key={method}
              className="rounded-xl border border-card-border bg-card-bg p-4 transition-shadow hover:shadow-md"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className={config.color}>{config.icon}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-main-muted">
                  {config.label}
                </span>
              </div>
              <p className="font-[family-name:var(--font-heading)] text-lg font-bold text-main-text sm:text-xl">
                {formatMAD(total)}
              </p>
            </div>
          );
        })}
      </div>

      {/* Enc / Dec / Flux net summary */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button
          onClick={() => navigate("Encaissement")}
          className="flex items-center gap-3 rounded-xl border border-card-border bg-card-bg p-4 text-left transition-shadow hover:shadow-md"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green/10">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-main-muted">Encaissement</p>
            <p className="font-[family-name:var(--font-heading)] text-lg font-bold text-green">{formatMAD(totalEnc)}</p>
          </div>
        </button>

        <button
          onClick={() => navigate("Décaissement")}
          className="flex items-center gap-3 rounded-xl border border-card-border bg-card-bg p-4 text-left transition-shadow hover:shadow-md"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red/10">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-main-muted">Decaissement</p>
            <p className="font-[family-name:var(--font-heading)] text-lg font-bold text-red">{formatMAD(totalDec)}</p>
          </div>
        </button>

        <button
          onClick={() => navigate("Balance")}
          className="flex items-center gap-3 rounded-xl border border-card-border bg-card-bg p-4 text-left transition-shadow hover:shadow-md"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-main-muted">Flux Net</p>
            <p className={`font-[family-name:var(--font-heading)] text-lg font-bold ${fluxNet >= 0 ? "text-green" : "text-red"}`}>
              {formatMAD(fluxNet)}
            </p>
          </div>
        </button>
      </div>

      {/* Cash balance card */}
      <div className="rounded-xl border border-card-border bg-green/5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-main-muted">
              Solde Espèces Cumulatif
            </p>
            <p className="mt-0.5 text-xs text-main-muted">
              Espèces reçues ({formatMAD(cashBalance.encCash)}) – Dépenses espèces ({formatMAD(cashBalance.decCash)}) du {formatFrenchDateRange(monthKey)}
            </p>
          </div>
          <div className="text-right">
            <p className={`font-[family-name:var(--font-heading)] text-2xl font-bold ${cashBalance.balance >= 0 ? "text-green" : "text-red"}`}>
              {formatMAD(cashBalance.balance)}
            </p>
            {cashBalance.balance > 0 && (
              <p className="text-xs font-medium text-green">A remettre en caisse</p>
            )}
          </div>
        </div>
      </div>

      {/* Currency breakdown */}
      {currencyBreakdown.length > 0 && (
        <div className="rounded-xl border border-card-border bg-card-bg p-5">
          <p className="mb-4 text-xs font-bold uppercase tracking-wider text-main-muted">
            Composition par Devise
          </p>
          <div className="space-y-3">
            {currencyBreakdown.map(({ currency, total, madEquivalent }) => (
              <div key={currency} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-11 items-center justify-center rounded border border-card-border text-[10px] font-bold text-main-muted">
                    {currency || "MAD"}
                  </span>
                  <span className={`text-sm font-medium ${total >= 0 ? "text-main-text" : "text-red"}`}>
                    {total >= 0 ? "" : "-"}{new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(total))} {currency || "MAD"}
                  </span>
                </div>
                {currency !== "MAD" && (
                  <span className="text-xs text-main-muted">
                    = {formatMAD(madEquivalent)}
                  </span>
                )}
              </div>
            ))}
            <div className="border-t border-card-border pt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-main-muted">Total converti</span>
                <span className={`font-[family-name:var(--font-heading)] text-base font-bold ${cashBalance.balance >= 0 ? "text-main-text" : "text-red"}`}>
                  {formatMAD(currencyBreakdown.reduce((sum, c) => sum + c.madEquivalent, 0))}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
