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
          <input
            type="password"
            autoComplete={isFirstSetup ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-cream-dark bg-white px-4 py-3 text-sm text-brown-dark outline-none focus:border-gold focus:ring-1 focus:ring-gold"
          />
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
