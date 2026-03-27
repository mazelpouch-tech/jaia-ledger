"use client";

import { useEffect, useCallback } from "react";

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

interface UseKeyboardShortcutsProps {
  onNavigate: (page: PageKey) => void;
  onToggleSidebar: () => void;
  onToggleDarkMode?: () => void;
}

const SHORTCUTS: Record<string, { key: string; page: PageKey; label: string }> = {
  "1": { key: "1", page: "dashboard", label: "Accueil" },
  "2": { key: "2", page: "encaissement", label: "Encaissement" },
  "3": { key: "3", page: "decaissement", label: "Décaissement" },
  "4": { key: "4", page: "balance", label: "Balance" },
  "5": { key: "5", page: "statistique", label: "Statistiques" },
  "6": { key: "6", page: "recap-mensuel", label: "Récap Mensuel" },
  "7": { key: "7", page: "rapport-encaissement", label: "Rapport Enc." },
  "8": { key: "8", page: "rapport-decaissement", label: "Rapport Déc." },
};

export function useKeyboardShortcuts({
  onNavigate,
  onToggleSidebar,
  onToggleDarkMode,
}: UseKeyboardShortcutsProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger in input fields
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      // Alt+number for navigation
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const shortcut = SHORTCUTS[e.key];
        if (shortcut) {
          e.preventDefault();
          onNavigate(shortcut.page);
          return;
        }
      }

      // Alt+M = toggle sidebar menu
      if (e.altKey && e.key === "m") {
        e.preventDefault();
        onToggleSidebar();
        return;
      }

      // Alt+D = toggle dark mode
      if (e.altKey && e.key === "d" && onToggleDarkMode) {
        e.preventDefault();
        onToggleDarkMode();
        return;
      }

      // Escape = close sidebar
      if (e.key === "Escape") {
        onToggleSidebar();
      }
    },
    [onNavigate, onToggleSidebar, onToggleDarkMode]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

export { SHORTCUTS };
