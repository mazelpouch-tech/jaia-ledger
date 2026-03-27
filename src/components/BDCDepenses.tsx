"use client";

import { useState, useEffect, useCallback } from "react";
import { formatMAD, formatDateShort, getTodayISO } from "@/lib/format";
import { useToast } from "@/components/Toast";
import { generateBDCPdf } from "@/lib/pdf";

interface Article {
  description: string;
  quantite: number;
  prixUnitaireHT: number;
  tauxTVA: number;
}

interface BDC {
  id: string;
  numero: string;
  date: string;
  fournisseur: string;
  articles: Article[];
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  statut: "payé" | "brouillon" | "envoyé";
}

type ViewMode = "list" | "create" | "detail";

const emptyArticle = (): Article => ({
  description: "",
  quantite: 1,
  prixUnitaireHT: 0,
  tauxTVA: 20,
});

function computeTotals(articles: Article[]) {
  const totalHT = articles.reduce((s, a) => s + a.quantite * a.prixUnitaireHT, 0);
  const totalTVA = articles.reduce(
    (s, a) => s + a.quantite * a.prixUnitaireHT * (a.tauxTVA / 100),
    0
  );
  return { totalHT, totalTVA, totalTTC: totalHT + totalTVA };
}

function StatusBadge({ statut }: { statut: string }) {
  const cls =
    statut === "payé"
      ? "bg-green-light text-green"
      : statut === "envoyé"
        ? "bg-amber-light text-gold"
        : "bg-cream-dark text-brown";
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {statut}
    </span>
  );
}

export default function BDCDepenses() {
  const { toast } = useToast();
  const [bdcs, setBdcs] = useState<BDC[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("list");
  const [selectedBDC, setSelectedBDC] = useState<BDC | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [formDate, setFormDate] = useState(getTodayISO());
  const [formFournisseur, setFormFournisseur] = useState("");
  const [formArticles, setFormArticles] = useState<Article[]>([emptyArticle()]);

  const fetchBDCs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bdc-depenses");
      if (res.ok) {
        const d = await res.json();
        setBdcs(Array.isArray(d) ? d : d.data ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBDCs();
  }, [fetchBDCs]);

  const openCreate = () => {
    setFormDate(getTodayISO());
    setFormFournisseur("");
    setFormArticles([emptyArticle()]);
    setView("create");
  };

  const openDetail = (bdc: BDC) => {
    setSelectedBDC(bdc);
    setView("detail");
  };

  const updateArticle = (index: number, field: keyof Article, value: string | number) => {
    setFormArticles((prev) =>
      prev.map((a, i) => (i === index ? { ...a, [field]: value } : a))
    );
  };

  const removeArticle = (index: number) => {
    setFormArticles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!formFournisseur.trim()) return;
    const validArticles = formArticles.filter((a) => a.description.trim());
    if (validArticles.length === 0) return;

    const totals = computeTotals(validArticles);
    setSaving(true);
    try {
      const res = await fetch("/api/bdc-depenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: formDate,
          fournisseur: formFournisseur,
          articles: validArticles,
          ...totals,
        }),
      });
      if (res.ok) {
        toast("BDC créé avec succès");
        await fetchBDCs();
        setView("list");
      } else {
        toast("Erreur lors de la création", "error");
      }
    } catch {
      toast("Erreur lors de la création", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/bdc-depenses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast(`Statut mis à jour : ${status}`);
        await fetchBDCs();
        if (selectedBDC && selectedBDC.id === id) {
          setSelectedBDC({ ...selectedBDC, statut: status as BDC["statut"] });
        }
      } else {
        toast("Erreur lors de la mise à jour", "error");
      }
    } catch {
      toast("Erreur lors de la mise à jour", "error");
    }
  };

  const handleDeleteBDC = async (id: string) => {
    try {
      const res = await fetch(`/api/bdc-depenses/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast("BDC supprimé");
        setDeletingId(null);
        setView("list");
        await fetchBDCs();
      } else {
        toast("Erreur lors de la suppression", "error");
      }
    } catch {
      toast("Erreur lors de la suppression", "error");
    }
  };

  const totals = computeTotals(formArticles);

  const handleExportPdf = (bdc: BDC) => {
    generateBDCPdf({
      numero: bdc.numero,
      date: formatDateShort(bdc.date),
      clientOrSupplier: bdc.fournisseur,
      clientLabel: "Fournisseur",
      articles: bdc.articles,
      totalHT: bdc.totalHT,
      totalTVA: bdc.totalTVA,
      totalTTC: bdc.totalTTC,
      type: "depense",
    });
    toast("PDF généré");
  };

  // Detail view
  if (view === "detail" && selectedBDC) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setView("list")}
            className="text-sm font-medium text-gold hover:underline"
          >
            &larr; Retour
          </button>
          <button
            onClick={() => handleExportPdf(selectedBDC)}
            className="flex items-center gap-2 rounded-lg border border-cream-dark bg-white px-4 py-2 text-sm font-medium text-brown-dark transition-colors hover:bg-cream-dark"
          >
            <span>&#128196;</span> Exporter PDF
          </button>
        </div>
        <div className="rounded-xl border border-cream-dark bg-white p-5">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-brown-dark">
              BDC {selectedBDC.numero}
            </h2>
            <StatusBadge statut={selectedBDC.statut} />
          </div>
          <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-brown">Date :</span>{" "}
              <span className="font-medium text-brown-dark">{formatDateShort(selectedBDC.date)}</span>
            </div>
            <div>
              <span className="text-brown">Fournisseur :</span>{" "}
              <span className="font-medium text-brown-dark">{selectedBDC.fournisseur}</span>
            </div>
          </div>

          {/* Articles */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-cream-dark text-xs font-semibold uppercase tracking-wide text-brown">
                  <th className="pb-2 pr-3">Description</th>
                  <th className="pb-2 pr-3 text-right">Qt&eacute;</th>
                  <th className="pb-2 pr-3 text-right">P.U. HT</th>
                  <th className="pb-2 pr-3 text-right">TVA</th>
                  <th className="pb-2 text-right">Total HT</th>
                </tr>
              </thead>
              <tbody>
                {selectedBDC.articles.map((a, i) => (
                  <tr key={i} className="border-b border-cream-dark/50">
                    <td className="py-2 pr-3 text-brown-dark">{a.description}</td>
                    <td className="py-2 pr-3 text-right text-brown-dark">{a.quantite}</td>
                    <td className="py-2 pr-3 text-right text-brown-dark">{formatMAD(a.prixUnitaireHT)}</td>
                    <td className="py-2 pr-3 text-right text-brown-dark">{a.tauxTVA}%</td>
                    <td className="py-2 text-right font-medium text-brown-dark">
                      {formatMAD(a.quantite * a.prixUnitaireHT)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="mt-4 space-y-1 border-t border-cream-dark pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-brown">Total HT</span>
              <span className="font-medium text-brown-dark">{formatMAD(selectedBDC.totalHT)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-brown">Total TVA</span>
              <span className="font-medium text-brown-dark">{formatMAD(selectedBDC.totalTVA)}</span>
            </div>
            <div className="flex justify-between text-base">
              <span className="font-semibold text-brown-dark">Total TTC</span>
              <span className="font-bold text-red">{formatMAD(selectedBDC.totalTTC)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-4 flex flex-col gap-2 border-t border-cream-dark pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2">
              <span className="text-xs font-medium text-brown">Changer le statut :</span>
              {(["brouillon", "envoyé", "payé"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(selectedBDC.id, s)}
                  disabled={selectedBDC.statut === s}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    selectedBDC.statut === s
                      ? "cursor-default opacity-50"
                      : "hover:opacity-80"
                  } ${
                    s === "payé"
                      ? "bg-green-light text-green"
                      : s === "envoyé"
                        ? "bg-amber-light text-gold"
                        : "bg-cream-dark text-brown"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <button
              onClick={() => setDeletingId(selectedBDC.id)}
              className="rounded-lg border border-red/30 px-3 py-1.5 text-xs font-medium text-red transition-colors hover:bg-red-light"
            >
              Supprimer ce BDC
            </button>
          </div>
        </div>

        {/* Delete Confirmation */}
        {deletingId !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-brown-dark">Confirmer la suppression</h3>
              <p className="mt-2 text-sm text-brown">
                Supprimer ce bon de commande et tous ses articles ? Cette action est irr&eacute;versible.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setDeletingId(null)}
                  className="rounded-lg border border-cream-dark px-4 py-2 text-sm font-medium text-brown hover:bg-cream-dark"
                >
                  Annuler
                </button>
                <button
                  onClick={() => handleDeleteBDC(deletingId)}
                  className="rounded-lg bg-red px-4 py-2 text-sm font-medium text-white hover:bg-red/90"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Create form
  if (view === "create") {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <button
          onClick={() => setView("list")}
          className="text-sm font-medium text-gold hover:underline"
        >
          &larr; Retour
        </button>
        <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-brown-dark">
          Nouveau BDC D&eacute;pense
        </h2>
        <div className="rounded-xl border border-cream-dark bg-white p-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brown">
                Date
              </label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full rounded-lg border border-cream-dark bg-cream px-3 py-2 text-sm text-brown-dark focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brown">
                Fournisseur
              </label>
              <input
                type="text"
                value={formFournisseur}
                onChange={(e) => setFormFournisseur(e.target.value)}
                placeholder="Nom du fournisseur"
                className="w-full rounded-lg border border-cream-dark bg-cream px-3 py-2 text-sm text-brown-dark placeholder:text-brown/50 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
              />
            </div>
          </div>

          {/* Articles */}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-brown">
              Articles
            </h3>
            <div className="space-y-3">
              {formArticles.map((a, i) => (
                <div key={i} className="rounded-lg border border-cream-dark bg-cream p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-brown">Article {i + 1}</span>
                    {formArticles.length > 1 && (
                      <button
                        onClick={() => removeArticle(i)}
                        className="text-xs text-red hover:underline"
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        value={a.description}
                        onChange={(e) => updateArticle(i, "description", e.target.value)}
                        placeholder="Description"
                        className="w-full rounded-md border border-cream-dark bg-white px-2 py-1.5 text-sm text-brown-dark placeholder:text-brown/50 focus:border-gold focus:outline-none"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        min={1}
                        value={a.quantite}
                        onChange={(e) => updateArticle(i, "quantite", Number(e.target.value))}
                        placeholder="Qt\u00e9"
                        className="w-full rounded-md border border-cream-dark bg-white px-2 py-1.5 text-sm text-brown-dark focus:border-gold focus:outline-none"
                      />
                      <span className="mt-0.5 block text-[10px] text-brown">Quantit&eacute;</span>
                    </div>
                    <div>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={a.prixUnitaireHT}
                        onChange={(e) => updateArticle(i, "prixUnitaireHT", Number(e.target.value))}
                        placeholder="P.U. HT"
                        className="w-full rounded-md border border-cream-dark bg-white px-2 py-1.5 text-sm text-brown-dark focus:border-gold focus:outline-none"
                      />
                      <span className="mt-0.5 block text-[10px] text-brown">Prix HT</span>
                    </div>
                  </div>
                  <div className="mt-2 w-24">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={a.tauxTVA}
                      onChange={(e) => updateArticle(i, "tauxTVA", Number(e.target.value))}
                      className="w-full rounded-md border border-cream-dark bg-white px-2 py-1.5 text-sm text-brown-dark focus:border-gold focus:outline-none"
                    />
                    <span className="mt-0.5 block text-[10px] text-brown">TVA %</span>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setFormArticles((prev) => [...prev, emptyArticle()])}
              className="mt-3 rounded-lg border border-dashed border-gold/50 px-4 py-2 text-sm font-medium text-gold transition-colors hover:bg-amber-light"
            >
              + Ajouter un article
            </button>
          </div>

          {/* Totals */}
          <div className="space-y-1 border-t border-cream-dark pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-brown">Total HT</span>
              <span className="font-medium text-brown-dark">{formatMAD(totals.totalHT)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-brown">Total TVA</span>
              <span className="font-medium text-brown-dark">{formatMAD(totals.totalTVA)}</span>
            </div>
            <div className="flex justify-between text-base">
              <span className="font-semibold text-brown-dark">Total TTC</span>
              <span className="font-bold text-red">{formatMAD(totals.totalTTC)}</span>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-lg bg-red px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-red/90 disabled:opacity-50"
          >
            {saving ? "Enregistrement..." : "Enregistrer le BDC"}
          </button>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-brown-dark">
            BDC D&eacute;penses
          </h1>
          <p className="mt-1 text-sm text-brown">
            Bons de commande &mdash; D&eacute;penses
          </p>
        </div>
        <button
          onClick={openCreate}
          className="rounded-lg bg-red px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red/90"
        >
          Nouveau BDC
        </button>
      </div>

      {loading ? (
        <p className="py-12 text-center text-sm text-brown">Chargement...</p>
      ) : bdcs.length === 0 ? (
        <p className="rounded-xl border border-cream-dark bg-white py-12 text-center text-sm text-brown">
          Aucun bon de commande
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-cream-dark bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-cream-dark text-xs font-semibold uppercase tracking-wide text-brown">
                <th className="px-4 py-3">N&deg;</th>
                <th className="px-4 py-3">Date</th>
                <th className="hidden px-4 py-3 sm:table-cell">Fournisseur</th>
                <th className="hidden px-4 py-3 text-right sm:table-cell">Articles</th>
                <th className="hidden px-4 py-3 text-right md:table-cell">HT</th>
                <th className="hidden px-4 py-3 text-right md:table-cell">TVA</th>
                <th className="px-4 py-3 text-right">TTC</th>
                <th className="px-4 py-3 text-center">Statut</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {bdcs.map((bdc) => (
                <tr key={bdc.id} className="border-b border-cream-dark/50 last:border-0">
                  <td className="px-4 py-3 font-medium text-brown-dark">{bdc.numero}</td>
                  <td className="px-4 py-3 text-brown">{formatDateShort(bdc.date)}</td>
                  <td className="hidden px-4 py-3 text-brown-dark sm:table-cell">{bdc.fournisseur}</td>
                  <td className="hidden px-4 py-3 text-right text-brown sm:table-cell">
                    {bdc.articles?.length ?? 0}
                  </td>
                  <td className="hidden px-4 py-3 text-right text-brown-dark md:table-cell">
                    {formatMAD(bdc.totalHT)}
                  </td>
                  <td className="hidden px-4 py-3 text-right text-brown-dark md:table-cell">
                    {formatMAD(bdc.totalTVA)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-red">
                    {formatMAD(bdc.totalTTC)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge statut={bdc.statut} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => openDetail(bdc)}
                      className="rounded-md p-1.5 text-brown transition-colors hover:bg-cream-dark hover:text-brown-dark"
                      title="Voir le d\u00e9tail"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="h-4 w-4"
                      >
                        <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                        <path
                          fillRule="evenodd"
                          d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
