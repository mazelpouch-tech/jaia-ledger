"use client";

import { useState } from "react";

interface User {
  id: number;
  username: string;
  displayName: string;
  role: string;
}

interface LoginScreenProps {
  onLogin: (user: User) => void;
  isFirstSetup: boolean;
}

export default function LoginScreen({ onLogin, isFirstSetup }: LoginScreenProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password) {
      setError("Veuillez remplir tous les champs");
      return;
    }
    if (isFirstSetup && password.length < 4) {
      setError("Le mot de passe doit contenir au moins 4 caractères");
      return;
    }
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur de connexion");
        return;
      }

      onLogin(data.user);
    } catch {
      setError("Erreur de connexion au serveur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-cream">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-2xl font-bold text-white">
        J
      </div>
      <h1 className="mt-4 font-[family-name:var(--font-heading)] text-3xl font-bold text-brown-dark">
        JA&Iuml;A Ledger
      </h1>
      <p className="mt-1 text-sm text-brown">
        {isFirstSetup ? "Créez votre compte administrateur" : "Connectez-vous pour continuer"}
      </p>

      <form onSubmit={handleSubmit} className="mt-8 w-full max-w-xs space-y-4 px-4">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brown">
            Nom d&apos;utilisateur
          </label>
          <input
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={isFirstSetup ? "admin" : ""}
            className="w-full rounded-lg border border-cream-dark bg-white px-4 py-3 text-sm text-brown-dark outline-none focus:border-gold focus:ring-1 focus:ring-gold"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brown">
            Mot de passe
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              autoComplete={isFirstSetup ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-cream-dark bg-white px-4 py-3 pr-11 text-sm text-brown-dark outline-none focus:border-gold focus:ring-1 focus:ring-gold"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-brown transition-colors hover:text-gold"
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              )}
            </button>
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-red-light px-3 py-2 text-sm text-red">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-gold py-3 text-sm font-semibold text-white transition-colors hover:bg-gold-light disabled:opacity-50"
        >
          {loading ? "Connexion..." : isFirstSetup ? "Créer le compte" : "Se connecter"}
        </button>
      </form>

      {isFirstSetup && (
        <p className="mt-6 max-w-xs px-4 text-center text-xs text-brown">
          Ce sera votre compte administrateur. Vous pourrez ajouter d&apos;autres utilisateurs ensuite.
        </p>
      )}
    </div>
  );
}
