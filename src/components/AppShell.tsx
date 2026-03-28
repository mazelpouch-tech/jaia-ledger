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
import Calendrier from "@/components/Calendrier";
import BDCRecettes from "@/components/BDCRecettes";
import BDCDepenses from "@/components/BDCDepenses";
import Parametres from "@/components/Parametres";
import PinLock from "@/components/PinLock";

type PageKey =
  | "dashboard"
  | "encaissement"
  | "decaissement"
  | "rapport-encaissement"
  | "rapport-decaissement"
  | "balance"
  | "recap-mensuel"
  | "statistique"
  | "calendrier"
  | "bdc-recettes"
  | "bdc-depenses"
  | "parametres";

interface NavItem {
  key: PageKey;
  label: string;
  icon: React.ReactNode;
}

function IconHome() { return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>; }
function IconCashIn() { return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 7l-5-5-5 5"/><path d="M2 17h20"/></svg>; }
function IconCashOut() { return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22V2M7 17l5 5 5-5"/><path d="M2 7h20"/></svg>; }
function IconReport() { return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>; }
function IconBalance() { return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18"/><path d="M5 8l7-5 7 5"/><path d="M3 13h4l1 4H4l-1-4z"/><path d="M17 13h4l-1 4h-4l1-4z"/></svg>; }
function IconCalendar() { return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>; }
function IconChart() { return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>; }
function IconRecap() { return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>; }
function IconInvoice() { return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>; }
function IconSettings() { return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>; }

const navItems: NavItem[] = [
  { key: "dashboard", label: "Menu Principal", icon: <IconHome /> },
  { key: "encaissement", label: "Enregistrer Recette", icon: <IconCashIn /> },
  { key: "decaissement", label: "Enregistrer Dépense", icon: <IconCashOut /> },
  { key: "rapport-encaissement", label: "Rapport Encaissements", icon: <IconReport /> },
  { key: "rapport-decaissement", label: "Rapport Décaissements", icon: <IconReport /> },
  { key: "balance", label: "Balance", icon: <IconBalance /> },
  { key: "recap-mensuel", label: "Recap Mensuel", icon: <IconRecap /> },
  { key: "statistique", label: "Statistiques", icon: <IconChart /> },
  { key: "calendrier", label: "Calendrier", icon: <IconCalendar /> },
  { key: "bdc-recettes", label: "BDC Recettes", icon: <IconInvoice /> },
  { key: "bdc-depenses", label: "BDC Dépenses", icon: <IconInvoice /> },
  { key: "parametres", label: "Paramètres", icon: <IconSettings /> },
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
  calendrier: Calendrier,
  "bdc-recettes": BDCRecettes,
  "bdc-depenses": BDCDepenses,
  parametres: Parametres,
};

function formatFrenchDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [locked, setLocked] = useState(true);
  const [activePage, setActivePage] = useState<PageKey>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [todayStr, setTodayStr] = useState("");
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const hasPin = localStorage.getItem("jaia-pin-hash");
    if (!hasPin) setLocked(false);
  }, []);

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

  if (locked) {
    return <PinLock onUnlock={() => setLocked(false)} />;
  }

  return (
    <div className="flex min-h-screen bg-sidebar-bg font-[family-name:var(--font-body)]">
      {/* Desktop Sidebar - always visible on lg+ */}
      <aside className="fixed left-0 top-0 z-40 hidden h-full w-64 flex-col overflow-y-auto bg-sidebar-bg lg:flex">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-lg font-bold text-white">
            J
          </div>
          <div>
            <h1 className="text-lg font-bold text-sidebar-text">JAÏA Ledger</h1>
            <p className="text-xs text-sidebar-muted">Gestion Hôtelière</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2">
          {navItems.map((item) => {
            const isActive = activePage === item.key;
            return (
              <button
                key={item.key}
                onClick={() => handleNavClick(item.key)}
                className={`mb-0.5 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                  isActive
                    ? "bg-accent text-white font-medium"
                    : "text-sidebar-muted hover:bg-white/5 hover:text-sidebar-text"
                }`}
              >
                <span className={isActive ? "text-white" : "text-sidebar-muted"}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="border-t border-white/10 px-4 py-4">
          <button
            onClick={toggleDarkMode}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-muted transition-colors hover:bg-white/5 hover:text-sidebar-text"
          >
            <span className="text-lg">{darkMode ? "☀" : "☾"}</span>
            <span>{darkMode ? "Mode clair" : "Mode sombre"}</span>
          </button>
        </div>
      </aside>

      {/* Mobile sidebar backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/50 transition-opacity duration-300 lg:hidden ${
          sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Mobile Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-72 flex-col overflow-y-auto bg-sidebar-bg shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-base font-bold text-white">
              J
            </div>
            <h2 className="text-lg font-bold text-sidebar-text">JAÏA Ledger</h2>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sidebar-muted transition-colors hover:bg-white/10 hover:text-sidebar-text"
            aria-label="Fermer le menu"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 px-3 py-2">
          {navItems.map((item) => {
            const isActive = activePage === item.key;
            return (
              <button
                key={item.key}
                onClick={() => handleNavClick(item.key)}
                className={`mb-0.5 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                  isActive
                    ? "bg-accent text-white font-medium"
                    : "text-sidebar-muted hover:bg-white/5 hover:text-sidebar-text"
                }`}
              >
                <span className={isActive ? "text-white" : "text-sidebar-muted"}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-white/10 px-4 py-4">
          <button
            onClick={toggleDarkMode}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-muted transition-colors hover:bg-white/5 hover:text-sidebar-text"
          >
            <span className="text-lg">{darkMode ? "☀" : "☾"}</span>
            <span>{darkMode ? "Mode clair" : "Mode sombre"}</span>
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col lg:ml-64">
        {/* Top header */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-card-border bg-main-bg px-4 py-3 lg:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-main-text transition-colors hover:bg-card-border lg:hidden"
              aria-label="Ouvrir le menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-main-muted">{activeLabel}</p>
              <p className="text-base font-semibold capitalize text-main-text">{todayStr}</p>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 p-4 pb-20 lg:p-6 lg:pb-6">
          {activePage === "dashboard" ? (
            <ActiveComponent onNavigate={handleDashboardNavigate} />
          ) : (
            <ActiveComponent />
          )}
          {children}
        </main>
      </div>

      {/* Bottom navigation bar (mobile only) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-card-border bg-main-bg py-2 lg:hidden">
        {[
          { key: "dashboard" as PageKey, icon: <IconHome />, label: "Accueil" },
          { key: "encaissement" as PageKey, icon: <IconCashIn />, label: "Recette" },
          { key: "decaissement" as PageKey, icon: <IconCashOut />, label: "Dépense" },
          { key: "balance" as PageKey, icon: <IconBalance />, label: "Balance" },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => handleNavClick(item.key)}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 text-xs transition-colors ${
              activePage === item.key
                ? "font-semibold text-accent"
                : "text-main-muted"
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
        <button
          onClick={() => setSidebarOpen(true)}
          className="flex flex-col items-center gap-0.5 px-2 py-1 text-xs text-main-muted transition-colors"
        >
          <span className="text-xl">···</span>
          <span>Plus</span>
        </button>
      </nav>
    </div>
  );
}
