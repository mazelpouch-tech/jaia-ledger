"use client";

import { useState, useEffect } from "react";
import { getTodayISO } from "@/lib/format";

const DEFAULT_CATEGORIES = [
  "Salaires & charges",
  "Alimentation & boissons",
  "Entretien & réparations",
  "Fournitures",
  "Énergie & eau",
  "Marketing & publicité",
  "Assurances",
  "Impôts & taxes",
  "Transport",
  "Autre",
];

const PAYMENT_METHODS = ["Espèces", "Carte bancaire", "Virement", "Chèque"];

function generateRef(): string {
  const num = Math.floor(100 + Math.random() * 900);
  return `DEC-${num}`;
}

interface SettingsData {
  expenseCategories?: string[];
  currencies?: string[];
}

export default function Decaissement() {
  const [settings, setSettings] = useState<SettingsData>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [date, setDate] = useState(getTodayISO());
  const [reference] = useState(generateRef());
  const [categorie, setCategorie] = useState("");
  const [fournisseur, setFournisseur] = useState("");
  const [description, setDescription] = useState("");
  const [devise, setDevise] = useState("MAD");
  const [montant, setMontant] = useState("");
  const [tauxChange, setTauxChange] = useState("");
  const [modeReglement, setModeReglement] = useState("");
  const [notes, setNotes] = useState("");

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

  const categories = settings.expenseCategories?.length
    ? settings.expenseCategories
    : DEFAULT_CATEGORIES;
  const currencies = settings.currencies?.length
    ? settings.currencies
    : ["MAD", "EUR", "USD", "GBP"];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setSubmitting(true);

    try {
      const body = {
        date,
        reference,
        categorie,
        fournisseur: fournisseur || undefined,
        description,
        devise,
        montant: parseFloat(montant),
        tauxChange: tauxChange ? parseFloat(tauxChange) : undefined,
        modeReglement,
        notes: notes || undefined,
      };

      const res = await fetch("/api/decaissements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Erreur lors de l'enregistrement");
      }

      setSuccess(true);
      // Reset form
      setDate(getTodayISO());
      setCategorie("");
      setFournisseur("");
      setDescription("");
      setDevise("MAD");
      setMontant("");
      setTauxChange("");
      setModeReglement("");
      setNotes("");

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
          Enregistrer une d&eacute;pense
        </h1>
        <p className="mt-1 text-sm text-brown">Saisir un nouveau d&eacute;caissement</p>
      </div>

      {/* Success Toast */}
      {success && (
        <div className="rounded-lg bg-green-light px-4 py-3 text-sm font-medium text-green">
          D&eacute;caissement enregistr&eacute; avec succ&egrave;s !
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
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-cream-dark bg-white px-3 py-2.5 text-sm text-brown-dark outline-none focus:border-gold focus:ring-1 focus:ring-gold"
              />
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

          {/* Catégorie */}
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

          {/* Fournisseur */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brown">
              Fournisseur
            </label>
            <input
              type="text"
              value={fournisseur}
              onChange={(e) => setFournisseur(e.target.value)}
              placeholder="Nom du fournisseur"
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
              placeholder="Description de la dépense"
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
                onChange={(e) => setMontant(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-cream-dark bg-white px-3 py-2.5 text-sm text-brown-dark outline-none focus:border-gold focus:ring-1 focus:ring-gold"
              />
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

          {/* Notes */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brown">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Notes complémentaires..."
              className="w-full rounded-lg border border-cream-dark bg-white px-3 py-2.5 text-sm text-brown-dark outline-none focus:border-gold focus:ring-1 focus:ring-gold"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full rounded-lg bg-gold py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-gold-light disabled:opacity-50"
          >
            {submitting ? "Enregistrement..." : "Enregistrer la dépense"}
          </button>
        </div>
      </form>
    </div>
  );
}
