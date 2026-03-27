"use client";

import { useState, useEffect, useCallback } from "react";
import { useKeyboardShortcuts } from "@/lib/useKeyboardShortcuts";
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
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    setTodayStr(formatFrenchDate(new Date()));

    const saved = localStorage.getItem("darkMode");
    if (saved !== null) {
      const isDark = saved === "true";
      setDarkMode(isDark);
      document.documentElement.classList.toggle("dark", isDark);
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleDarkMode = useCallback(() => {
    setDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem("darkMode", String(next));
      document.documentElement.classList.toggle("dark", next);
      return next;
    });
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

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  useKeyboardShortcuts({
    onNavigate: handleNavClick,
    onToggleSidebar: toggleSidebar,
    onToggleDarkMode: toggleDarkMode,
  });

  return (
    <div className="min-h-screen bg-cream font-[family-name:var(--font-body)]">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-cream-dark bg-cream px-4 py-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-2xl text-brown-dark transition-colors hover:bg-cream-dark"
            aria-label="Ouvrir le menu"
          >
            ☰
          </button>
          <button
            onClick={toggleDarkMode}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-xl text-brown-dark transition-colors hover:bg-cream-dark"
            aria-label={darkMode ? "Passer en mode clair" : "Passer en mode sombre"}
          >
            {darkMode ? "\u2600" : "\u263E"}
          </button>
        </div>

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
      <main className="p-4 pb-20 sm:pb-4">
        {activePage === "dashboard" ? (
          <ActiveComponent onNavigate={handleDashboardNavigate} />
        ) : (
          <ActiveComponent />
        )}
        {children}
      </main>

      {/* Bottom navigation bar (mobile only) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-cream-dark bg-cream-dark py-2 sm:hidden">
        {[
          { key: "dashboard" as PageKey, icon: "⌂", label: "Accueil" },
          { key: "encaissement" as PageKey, icon: "↓", label: "Recette" },
          { key: "decaissement" as PageKey, icon: "↑", label: "Dépense" },
          { key: "balance" as PageKey, icon: "⚖", label: "Balance" },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => handleNavClick(item.key)}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 text-xs transition-colors ${
              activePage === item.key
                ? "font-semibold text-gold"
                : "text-brown"
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
        <button
          onClick={() => setSidebarOpen(true)}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 text-xs text-brown transition-colors`}
        >
          <span className="text-xl">···</span>
          <span>Plus</span>
        </button>
      </nav>
    </div>
  );
}
