"use client";

import { useState, useEffect } from "react";
import { getTodayISO } from "@/lib/format";

const DEFAULT_CATEGORIES = [
  "Hébergement",
  "Restaurant",
  "Spa & Bien-être",
  "Activités",
  "Boutique",
  "Autre",
];

const PAYMENT_METHODS = ["Espèces", "Carte bancaire", "Virement", "Chèque"];

function generateRef(): string {
  const num = Math.floor(100 + Math.random() * 900);
  return `ENC-${num}`;
}

interface SettingsData {
  categories?: string[];
  rooms?: string[];
  currencies?: string[];
}

export default function Encaissement() {
  const [settings, setSettings] = useState<SettingsData>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [date, setDate] = useState(getTodayISO());
  const [reference] = useState(generateRef());
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [categorie, setCategorie] = useState("");
  const [chambre, setChambre] = useState("");
  const [client, setClient] = useState("");
  const [description, setDescription] = useState("");
  const [devise, setDevise] = useState("MAD");
  const [montant, setMontant] = useState("");
  const [tauxChange, setTauxChange] = useState("");
  const [modeReglement, setModeReglement] = useState("");

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
        }
      } catch {
        // use defaults
      }
    }
    fetchSettings();
  }, []);

  const categories = settings.categories?.length
    ? settings.categories
    : DEFAULT_CATEGORIES;
  const rooms = settings.rooms ?? [];
  const currencies = settings.currencies?.length
    ? settings.currencies
    : ["MAD", "EUR", "USD", "GBP"];

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!montant || parseFloat(montant) <= 0) {
      newErrors.montant = "Le montant doit être supérieur à 0";
    }
    if (checkIn && checkOut && checkOut < checkIn) {
      newErrors.checkOut = "Check-out doit être après check-in";
    }
    if (date && date > getTodayISO()) {
      newErrors.date = "La date ne peut pas être dans le futur";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setErrors({});
    setSuccess(false);
    if (!validate()) return;
    setSubmitting(true);

    try {
      const body = {
        date,
        reference,
        checkIn: checkIn || undefined,
        checkOut: checkOut || undefined,
        categorie,
        chambre: chambre || undefined,
        client: client || undefined,
        description,
        devise,
        montant: parseFloat(montant),
        tauxChange: tauxChange ? parseFloat(tauxChange) : undefined,
        modeReglement,
      };

      const res = await fetch("/api/encaissements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.status === 409) {
        const data = await res.json();
        const confirm = window.confirm(data.warning + "\n\nVoulez-vous continuer ?");
        if (confirm) {
          const retryRes = await fetch("/api/encaissements?force=true", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          if (!retryRes.ok) throw new Error("Erreur lors de l'enregistrement");
        } else {
          setSubmitting(false);
          return;
        }
      } else if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Erreur lors de l'enregistrement");
      }

      setSuccess(true);
      // Reset form
      setDate(getTodayISO());
      setCheckIn("");
      setCheckOut("");
      setCategorie("");
      setChambre("");
      setClient("");
      setDescription("");
      setDevise("MAD");
      setMontant("");
      setTauxChange("");
      setModeReglement("");

      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-brown-dark">
          Enregistrer une recette
        </h1>
        <p className="mt-1 text-sm text-brown">Saisir un nouvel encaissement</p>
      </div>

      {/* Success Toast */}
      {success && (
        <div className="rounded-lg bg-green-light px-4 py-3 text-sm font-medium text-green">
          Encaissement enregistr&eacute; avec succ&egrave;s !
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className="rounded-lg bg-red-light px-4 py-3 text-sm font-medium text-red">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="rounded-lg border border-cream-dark bg-cream p-5">
        <div className="space-y-5">
          {/* Date + Référence */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brown">
                Date <span className="text-red">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => { setDate(e.target.value); setErrors((prev) => { const { date: _, ...rest } = prev; return rest; }); }}
                className={`w-full rounded-lg border ${errors.date ? "border-red" : "border-cream-dark"} bg-white px-3 py-2.5 text-sm text-brown-dark outline-none focus:border-gold focus:ring-1 focus:ring-gold`}
              />
              {errors.date && <p className="mt-1 text-xs text-red">{errors.date}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brown">
                R&eacute;f&eacute;rence
              </label>
              <input
                type="text"
                readOnly
                value={reference}
                className="w-full rounded-lg border border-cream-dark bg-cream-dark px-3 py-2.5 text-sm text-brown"
              />
            </div>
          </div>

          {/* Check-in + Check-out */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brown">
                Check-in
              </label>
              <input
                type="date"
                value={checkIn}
                onChange={(e) => { setCheckIn(e.target.value); setErrors((prev) => { const { checkOut: _, ...rest } = prev; return rest; }); }}
                className="w-full rounded-lg border border-cream-dark bg-white px-3 py-2.5 text-sm text-brown-dark outline-none focus:border-gold focus:ring-1 focus:ring-gold"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brown">
                Check-out
              </label>
              <input
                type="date"
                value={checkOut}
                onChange={(e) => { setCheckOut(e.target.value); setErrors((prev) => { const { checkOut: _, ...rest } = prev; return rest; }); }}
                className={`w-full rounded-lg border ${errors.checkOut ? "border-red" : "border-cream-dark"} bg-white px-3 py-2.5 text-sm text-brown-dark outline-none focus:border-gold focus:ring-1 focus:ring-gold`}
              />
              {errors.checkOut && <p className="mt-1 text-xs text-red">{errors.checkOut}</p>}
            </div>
          </div>

          {/* Catégorie + Chambre */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brown">
                Cat&eacute;gorie <span className="text-red">*</span>
              </label>
              <select
                required
                value={categorie}
                onChange={(e) => setCategorie(e.target.value)}
                className="w-full rounded-lg border border-cream-dark bg-white px-3 py-2.5 text-sm text-brown-dark outline-none focus:border-gold focus:ring-1 focus:ring-gold"
              >
                <option value="">S&eacute;lectionner...</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brown">
                Chambre
              </label>
              <select
                value={chambre}
                onChange={(e) => setChambre(e.target.value)}
                className="w-full rounded-lg border border-cream-dark bg-white px-3 py-2.5 text-sm text-brown-dark outline-none focus:border-gold focus:ring-1 focus:ring-gold"
              >
                <option value="">S&eacute;lectionner...</option>
                {rooms.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Client */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brown">
              Client
            </label>
            <input
              type="text"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              placeholder="Nom du client"
              className="w-full rounded-lg border border-cream-dark bg-white px-3 py-2.5 text-sm text-brown-dark outline-none focus:border-gold focus:ring-1 focus:ring-gold"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brown">
              Description <span className="text-red">*</span>
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description de la recette"
              className="w-full rounded-lg border border-cream-dark bg-white px-3 py-2.5 text-sm text-brown-dark outline-none focus:border-gold focus:ring-1 focus:ring-gold"
            />
          </div>

          {/* Devise + Montant + Taux de change */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brown">
                Devise
              </label>
              <select
                value={devise}
                onChange={(e) => setDevise(e.target.value)}
                className="w-full rounded-lg border border-cream-dark bg-white px-3 py-2.5 text-sm text-brown-dark outline-none focus:border-gold focus:ring-1 focus:ring-gold"
              >
                {currencies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brown">
                Montant (MAD) <span className="text-red">*</span>
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={montant}
                onChange={(e) => { setMontant(e.target.value); setErrors((prev) => { const { montant: _, ...rest } = prev; return rest; }); }}
                placeholder="0.00"
                className={`w-full rounded-lg border ${errors.montant ? "border-red" : "border-cream-dark"} bg-white px-3 py-2.5 text-sm text-brown-dark outline-none focus:border-gold focus:ring-1 focus:ring-gold`}
              />
              {errors.montant && <p className="mt-1 text-xs text-red">{errors.montant}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brown">
                Taux de change
              </label>
              <input
                type="number"
                min="0"
                step="0.0001"
                value={tauxChange}
                onChange={(e) => setTauxChange(e.target.value)}
                placeholder="1.0000"
                className="w-full rounded-lg border border-cream-dark bg-white px-3 py-2.5 text-sm text-brown-dark outline-none focus:border-gold focus:ring-1 focus:ring-gold"
              />
            </div>
          </div>

          {/* Mode de règlement */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brown">
              Mode de r&egrave;glement <span className="text-red">*</span>
            </label>
            <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setModeReglement(method)}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                    modeReglement === method
                      ? "border-gold bg-gold text-white"
                      : "border-cream-dark bg-white text-brown hover:border-gold hover:text-gold"
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
            {/* Hidden input for required validation */}
            <input
              type="text"
              required
              value={modeReglement}
              onChange={() => {}}
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full rounded-lg bg-green py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-green/90 disabled:opacity-50"
          >
            {submitting ? "Enregistrement..." : "Enregistrer l'encaissement"}
          </button>
        </div>
      </form>
    </div>
  );
}
