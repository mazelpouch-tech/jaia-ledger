"use client";

import { useState, useEffect, useCallback } from "react";
import Dashboard from "@/components/Dashboard";
import Encaissement from "@/components/Encaissement";
import Decaissement from "@/components/Decaissement";
import RapportEncaissement from "@/components/RapportEncaissement";
import RapportDecaissement from "@/components/RapportDecaissement";
import Balance from "@/components/Balance";
import RecapMensuel from "@/components/RecapMensuel";
import Statistique from "@/components/Statistique";
import BDCRecettes from "@/components/BDCRecettes";
import BDCDepenses from "@/components/BDCDepenses";
import Parametres from "@/components/Parametres";

type PageKey =
  | "dashboard"
  | "encaissement"
  | "decaissement"
  | "rapport-encaissement"
  | "rapport-decaissement"
  | "balance"
  | "recap-mensuel"
  | "statistique"
  | "bdc-recettes"
  | "bdc-depenses"
  | "parametres";

interface NavItem {
  key: PageKey;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { key: "dashboard", label: "Menu Principal", icon: "🏠" },
  { key: "encaissement", label: "Encaissement", icon: "💰" },
  { key: "decaissement", label: "Décaissement", icon: "💸" },
  { key: "rapport-encaissement", label: "Rapport Encaissement", icon: "📊" },
  { key: "rapport-decaissement", label: "Rapport Décaissement", icon: "📊" },
  { key: "balance", label: "Balance", icon: "⚖️" },
  { key: "recap-mensuel", label: "Récap Mensuel", icon: "📅" },
  { key: "statistique", label: "Statistique", icon: "📈" },
  { key: "bdc-recettes", label: "BDC Recettes", icon: "📋" },
  { key: "bdc-depenses", label: "BDC Dépenses", icon: "📋" },
  { key: "parametres", label: "Paramètre", icon: "⚙️" },
];

const navigateMap: Record<string, PageKey> = {
  "Encaissement": "encaissement",
  "Décaissement": "decaissement",
  "Balance": "balance",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pageComponents: Record<PageKey, React.ComponentType<any>> = {
  dashboard: Dashboard,
  encaissement: Encaissement,
  decaissement: Decaissement,
  "rapport-encaissement": RapportEncaissement,
  "rapport-decaissement": RapportDecaissement,
  balance: Balance,
  "recap-mensuel": RecapMensuel,
  statistique: Statistique,
  "bdc-recettes": BDCRecettes,
  "bdc-depenses": BDCDepenses,
  parametres: Parametres,
};

function formatFrenchDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [activePage, setActivePage] = useState<PageKey>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [todayStr, setTodayStr] = useState("");

  useEffect(() => {
    setTodayStr(formatFrenchDate(new Date()));
  }, []);

  const handleNavClick = useCallback((key: PageKey) => {
    setActivePage(key);
    setSidebarOpen(false);
  }, []);

  const activeLabel =
    navItems.find((item) => item.key === activePage)?.label ?? "JAÏA Ledger";

  const ActiveComponent = pageComponents[activePage];

  const handleDashboardNavigate = useCallback(
    (page: string) => {
      const key = navigateMap[page];
      if (key) setActivePage(key);
    },
    [],
  );

  return (
    <div className="min-h-screen bg-cream font-[family-name:var(--font-body)]">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-cream-dark bg-cream px-4 py-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-2xl text-brown-dark transition-colors hover:bg-cream-dark"
          aria-label="Ouvrir le menu"
        >
          ☰
        </button>

        <h1 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-brown-dark">
          {activeLabel}
        </h1>

        <span className="text-sm text-brown">{todayStr}</span>
      </header>

      {/* Sidebar backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/40 transition-opacity duration-300 ${
          sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 h-full w-72 transform overflow-y-auto bg-cream-dark shadow-xl transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between border-b border-gold/20 px-4 py-4">
          <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-brown-dark">
            JAÏA Ledger
          </h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-xl text-brown transition-colors hover:bg-cream"
            aria-label="Fermer le menu"
          >
            ✕
          </button>
        </div>

        {/* Navigation */}
        <nav className="py-2">
          {navItems.map((item) => {
            const isActive = activePage === item.key;
            return (
              <button
                key={item.key}
                onClick={() => handleNavClick(item.key)}
                className={`flex w-full items-center gap-3 border-l-4 px-4 py-3 text-left text-sm transition-colors ${
                  isActive
                    ? "border-gold bg-cream font-semibold text-brown-dark"
                    : "border-transparent text-brown hover:bg-cream hover:text-brown-dark"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="p-4">
        {activePage === "dashboard" ? (
          <ActiveComponent onNavigate={handleDashboardNavigate} />
        ) : (
          <ActiveComponent />
        )}
        {children}
      </main>
    </div>
  );
}
