"use client";

import { useState, useEffect } from "react";

interface Devise {
  code: string;
  nom: string;
  taux: number;
}

interface Chambre {
  nom: string;
  active: boolean;
}

interface Settings {
  nomRiad: string;
  email: string;
  adresse: string;
  telephone: string;
  devise: string;
  ice: string;
  rc: string;
  tauxTVA: number;
  devises: Devise[];
  chambres: Chambre[];
  categoriesRecettes: string[];
  categoriesDepenses: string[];
}

const defaultSettings: Settings = {
  nomRiad: "",
  email: "",
  adresse: "",
  telephone: "",
  devise: "MAD",
  ice: "",
  rc: "",
  tauxTVA: 20,
  devises: [],
  chambres: [],
  categoriesRecettes: [],
  categoriesDepenses: [],
};

export default function Parametres() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Temporary inputs for adding items
  const [newChambre, setNewChambre] = useState("");
  const [newCatRecette, setNewCatRecette] = useState("");
  const [newCatDepense, setNewCatDepense] = useState("");
  const [newDeviseCode, setNewDeviseCode] = useState("");
  const [newDeviseNom, setNewDeviseNom] = useState("");
  const [newDeviseTaux, setNewDeviseTaux] = useState("");
  const [hasPin, setHasPin] = useState(false);

  useEffect(() => {
    setHasPin(!!localStorage.getItem("jaia-pin-hash"));
  }, []);

  const removePin = () => {
    if (window.confirm("Supprimer le code PIN ? L\u2019application ne sera plus prot\u00e9g\u00e9e.")) {
      localStorage.removeItem("jaia-pin-hash");
      setHasPin(false);
    }
  };

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setSettings({ ...defaultSettings, ...d });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) setSaved(true);
    } catch {
      // silent
    } finally {
      setSaving(false);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const updateField = (field: keyof Settings, value: string | number) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const toggleChambre = (index: number) => {
    setSettings((prev) => ({
      ...prev,
      chambres: prev.chambres.map((ch, i) =>
        i === index ? { ...ch, active: !ch.active } : ch
      ),
    }));
  };

  const addChambre = () => {
    if (!newChambre.trim()) return;
    setSettings((prev) => ({
      ...prev,
      chambres: [...prev.chambres, { nom: newChambre.trim(), active: true }],
    }));
    setNewChambre("");
  };

  const removeChambre = (index: number) => {
    setSettings((prev) => ({
      ...prev,
      chambres: prev.chambres.filter((_, i) => i !== index),
    }));
  };

  const addCategory = (type: "recettes" | "depenses") => {
    const value = type === "recettes" ? newCatRecette : newCatDepense;
    if (!value.trim()) return;
    const field = type === "recettes" ? "categoriesRecettes" : "categoriesDepenses";
    setSettings((prev) => ({
      ...prev,
      [field]: [...(prev[field] as string[]), value.trim()],
    }));
    if (type === "recettes") setNewCatRecette("");
    else setNewCatDepense("");
  };

  const removeCategory = (type: "recettes" | "depenses", index: number) => {
    const field = type === "recettes" ? "categoriesRecettes" : "categoriesDepenses";
    setSettings((prev) => ({
      ...prev,
      [field]: (prev[field] as string[]).filter((_, i) => i !== index),
    }));
  };

  const addDevise = () => {
    if (!newDeviseCode.trim() || !newDeviseNom.trim()) return;
    setSettings((prev) => ({
      ...prev,
      devises: [
        ...prev.devises,
        { code: newDeviseCode.trim().toUpperCase(), nom: newDeviseNom.trim(), taux: Number(newDeviseTaux) || 1 },
      ],
    }));
    setNewDeviseCode("");
    setNewDeviseNom("");
    setNewDeviseTaux("");
  };

  const updateDeviseTaux = (index: number, taux: number) => {
    setSettings((prev) => ({
      ...prev,
      devises: prev.devises.map((d, i) => (i === index ? { ...d, taux } : d)),
    }));
  };

  const removeDevise = (index: number) => {
    setSettings((prev) => ({
      ...prev,
      devises: prev.devises.filter((_, i) => i !== index),
    }));
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center text-sm text-brown">
        Chargement...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-8">
      {/* Header */}
      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-brown-dark">
          Param&egrave;tres
        </h1>
        <p className="mt-1 text-sm text-brown">
          Configuration du Riad JA&Iuml;A
        </p>
      </div>

      {/* Informations du Riad */}
      <div className="rounded-xl border border-cream-dark bg-white p-5">
        <h2 className="mb-4 font-[family-name:var(--font-heading)] text-xl font-semibold text-brown-dark">
          Informations du Riad
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brown">
              Nom du Riad
            </label>
            <input
              type="text"
              value={settings.nomRiad}
              onChange={(e) => updateField("nomRiad", e.target.value)}
              className="w-full rounded-lg border border-cream-dark bg-cream px-3 py-2 text-sm text-brown-dark focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brown">
              Email
            </label>
            <input
              type="email"
              value={settings.email}
              onChange={(e) => updateField("email", e.target.value)}
              className="w-full rounded-lg border border-cream-dark bg-cream px-3 py-2 text-sm text-brown-dark focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brown">
              Adresse
            </label>
            <input
              type="text"
              value={settings.adresse}
              onChange={(e) => updateField("adresse", e.target.value)}
              className="w-full rounded-lg border border-cream-dark bg-cream px-3 py-2 text-sm text-brown-dark focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brown">
              T&eacute;l&eacute;phone
            </label>
            <input
              type="tel"
              value={settings.telephone}
              onChange={(e) => updateField("telephone", e.target.value)}
              className="w-full rounded-lg border border-cream-dark bg-cream px-3 py-2 text-sm text-brown-dark focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brown">
              Devise principale
            </label>
            <input
              type="text"
              value={settings.devise}
              onChange={(e) => updateField("devise", e.target.value)}
              className="w-full rounded-lg border border-cream-dark bg-cream px-3 py-2 text-sm text-brown-dark focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brown">
              ICE
            </label>
            <input
              type="text"
              value={settings.ice}
              onChange={(e) => updateField("ice", e.target.value)}
              className="w-full rounded-lg border border-cream-dark bg-cream px-3 py-2 text-sm text-brown-dark focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brown">
              RC
            </label>
            <input
              type="text"
              value={settings.rc}
              onChange={(e) => updateField("rc", e.target.value)}
              className="w-full rounded-lg border border-cream-dark bg-cream px-3 py-2 text-sm text-brown-dark focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brown">
              Taux TVA (%)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={settings.tauxTVA}
              onChange={(e) => updateField("tauxTVA", Number(e.target.value))}
              className="w-full rounded-lg border border-cream-dark bg-cream px-3 py-2 text-sm text-brown-dark focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
            />
          </div>
        </div>
      </div>

      {/* Devises & Taux de change */}
      <div className="rounded-xl border border-cream-dark bg-white p-5">
        <h2 className="mb-4 font-[family-name:var(--font-heading)] text-xl font-semibold text-brown-dark">
          Devises &amp; Taux de change
        </h2>
        {settings.devises.length > 0 && (
          <div className="mb-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-cream-dark text-xs font-semibold uppercase tracking-wide text-brown">
                  <th className="pb-2 pr-3">Code</th>
                  <th className="pb-2 pr-3">Nom</th>
                  <th className="pb-2 pr-3 text-right">Taux (1 MAD =)</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {settings.devises.map((d, i) => (
                  <tr key={i} className="border-b border-cream-dark/50 last:border-0">
                    <td className="py-2 pr-3 font-medium text-brown-dark">{d.code}</td>
                    <td className="py-2 pr-3 text-brown-dark">{d.nom}</td>
                    <td className="py-2 pr-3">
                      <input
                        type="number"
                        min={0}
                        step={0.0001}
                        value={d.taux}
                        onChange={(e) => updateDeviseTaux(i, Number(e.target.value))}
                        className="w-24 rounded-md border border-cream-dark bg-cream px-2 py-1 text-right text-sm text-brown-dark focus:border-gold focus:outline-none"
                      />
                    </td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() => removeDevise(i)}
                        className="text-xs text-red hover:underline"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase text-brown">Code</label>
            <input
              type="text"
              value={newDeviseCode}
              onChange={(e) => setNewDeviseCode(e.target.value)}
              placeholder="EUR"
              className="w-20 rounded-md border border-cream-dark bg-cream px-2 py-1.5 text-sm text-brown-dark placeholder:text-brown/50 focus:border-gold focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase text-brown">Nom</label>
            <input
              type="text"
              value={newDeviseNom}
              onChange={(e) => setNewDeviseNom(e.target.value)}
              placeholder="Euro"
              className="w-28 rounded-md border border-cream-dark bg-cream px-2 py-1.5 text-sm text-brown-dark placeholder:text-brown/50 focus:border-gold focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase text-brown">Taux</label>
            <input
              type="number"
              min={0}
              step={0.0001}
              value={newDeviseTaux}
              onChange={(e) => setNewDeviseTaux(e.target.value)}
              placeholder="0.091"
              className="w-24 rounded-md border border-cream-dark bg-cream px-2 py-1.5 text-sm text-brown-dark placeholder:text-brown/50 focus:border-gold focus:outline-none"
            />
          </div>
          <button
            onClick={addDevise}
            className="rounded-lg border border-dashed border-gold/50 px-3 py-1.5 text-sm font-medium text-gold transition-colors hover:bg-amber-light"
          >
            + Ajouter
          </button>
        </div>
      </div>

      {/* Chambres */}
      <div className="rounded-xl border border-cream-dark bg-white p-5">
        <h2 className="mb-4 font-[family-name:var(--font-heading)] text-xl font-semibold text-brown-dark">
          Chambres ({settings.chambres.length})
        </h2>
        {settings.chambres.length > 0 && (
          <div className="mb-4 space-y-2">
            {settings.chambres.map((ch, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-cream-dark bg-cream px-4 py-2.5"
              >
                <span className="text-sm font-medium text-brown-dark">{ch.nom}</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleChambre(i)}
                    className={`relative h-6 w-11 rounded-full transition-colors ${
                      ch.active ? "bg-green" : "bg-cream-dark"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        ch.active ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                  <button
                    onClick={() => removeChambre(i)}
                    className="text-xs text-red hover:underline"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={newChambre}
            onChange={(e) => setNewChambre(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addChambre()}
            placeholder="Nom de la chambre"
            className="flex-1 rounded-lg border border-cream-dark bg-cream px-3 py-2 text-sm text-brown-dark placeholder:text-brown/50 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
          />
          <button
            onClick={addChambre}
            className="rounded-lg border border-dashed border-gold/50 px-4 py-2 text-sm font-medium text-gold transition-colors hover:bg-amber-light"
          >
            + Ajouter
          </button>
        </div>
      </div>

      {/* Categories */}
      <div className="rounded-xl border border-cream-dark bg-white p-5">
        <h2 className="mb-4 font-[family-name:var(--font-heading)] text-xl font-semibold text-brown-dark">
          Cat&eacute;gories pr&eacute;d&eacute;finies
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Recettes */}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-green">
              Cat&eacute;gories recettes
            </h3>
            {settings.categoriesRecettes.length > 0 && (
              <div className="mb-3 space-y-1.5">
                {settings.categoriesRecettes.map((cat, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-md bg-green-light px-3 py-1.5"
                  >
                    <span className="text-sm text-brown-dark">{cat}</span>
                    <button
                      onClick={() => removeCategory("recettes", i)}
                      className="text-xs text-red hover:underline"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={newCatRecette}
                onChange={(e) => setNewCatRecette(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCategory("recettes")}
                placeholder="Nouvelle cat&eacute;gorie"
                className="flex-1 rounded-md border border-cream-dark bg-cream px-2 py-1.5 text-sm text-brown-dark placeholder:text-brown/50 focus:border-gold focus:outline-none"
              />
              <button
                onClick={() => addCategory("recettes")}
                className="rounded-md bg-green-light px-2.5 py-1.5 text-xs font-semibold text-green transition-colors hover:bg-green/20"
              >
                +
              </button>
            </div>
          </div>

          {/* Depenses */}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-red">
              Cat&eacute;gories d&eacute;penses
            </h3>
            {settings.categoriesDepenses.length > 0 && (
              <div className="mb-3 space-y-1.5">
                {settings.categoriesDepenses.map((cat, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-md bg-red-light px-3 py-1.5"
                  >
                    <span className="text-sm text-brown-dark">{cat}</span>
                    <button
                      onClick={() => removeCategory("depenses", i)}
                      className="text-xs text-red hover:underline"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={newCatDepense}
                onChange={(e) => setNewCatDepense(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCategory("depenses")}
                placeholder="Nouvelle cat&eacute;gorie"
                className="flex-1 rounded-md border border-cream-dark bg-cream px-2 py-1.5 text-sm text-brown-dark placeholder:text-brown/50 focus:border-gold focus:outline-none"
              />
              <button
                onClick={() => addCategory("depenses")}
                className="rounded-md bg-red-light px-2.5 py-1.5 text-xs font-semibold text-red transition-colors hover:bg-red/20"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* S\u00e9curit\u00e9 */}
      <div className="rounded-xl border border-cream-dark bg-white p-5">
        <h2 className="mb-4 font-[family-name:var(--font-heading)] text-xl font-semibold text-brown-dark">
          S&eacute;curit&eacute;
        </h2>
        {hasPin ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green">Code PIN actif</p>
              <p className="text-xs text-brown">L&apos;application est prot&eacute;g&eacute;e par un code PIN</p>
            </div>
            <button onClick={removePin} className="rounded-lg border border-red/30 px-3 py-1.5 text-sm text-red transition-colors hover:bg-red-light">
              Supprimer
            </button>
          </div>
        ) : (
          <p className="text-sm text-brown">Aucun code PIN configur&eacute;. Rechargez l&apos;application pour en cr&eacute;er un.</p>
        )}
      </div>

      {/* Sauvegarde & Restauration */}
      <div className="rounded-xl border border-cream-dark bg-white p-5">
        <h2 className="mb-4 font-[family-name:var(--font-heading)] text-xl font-semibold text-brown-dark">
          Sauvegarde &amp; Restauration
        </h2>
        <p className="mb-4 text-sm text-brown">
          Exportez vos donn&eacute;es pour les sauvegarder ou les transf&eacute;rer.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={async () => {
              try {
                const res = await fetch("/api/backup");
                if (!res.ok) throw new Error("Export failed");
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `jaia-ledger-backup-${new Date().toISOString().split("T")[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
              } catch {
                alert("Erreur lors de l'export");
              }
            }}
            className="rounded-lg border border-gold bg-amber-light px-4 py-2.5 text-sm font-semibold text-gold transition-colors hover:bg-gold hover:text-white"
          >
            Exporter les donn&eacute;es
          </button>
          <button
            disabled
            className="rounded-lg border border-cream-dark px-4 py-2.5 text-sm font-semibold text-brown/50 opacity-60 cursor-not-allowed"
            title="Bient&ocirc;t disponible"
          >
            Restaurer (Bient&ocirc;t disponible)
          </button>
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-lg bg-gold px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-gold-light disabled:opacity-50"
      >
        {saving ? "Sauvegarde en cours..." : saved ? "Sauvegard\u00e9 !" : "Sauvegarder"}
      </button>
    </div>
  );
}
