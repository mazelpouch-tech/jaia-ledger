"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { formatMAD, formatDateShort, getMonthKey } from "@/lib/format";
import { useToast } from "@/components/Toast";

interface Decaissement {
  id: number;
  date: string;
  reference: string;
  categoryId?: number;
  categoryName?: string;
  supplier?: string;
  description: string;
  currency?: string;
  amount: string;
  exchangeRate?: string;
  paymentMethod: string;
  notes?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  "Alimentation": "bg-amber-light text-gold",
  "Entretien": "bg-green-light text-green",
  "Personnel": "bg-red-light text-red",
  "Fournitures": "bg-amber-light text-brown",
  "Services": "bg-green-light text-brown-dark",
  "Autre": "bg-cream-dark text-brown",
};

const PAYMENT_METHODS = ["Espèces", "Carte bancaire", "Virement", "Chèque"];

function buildMonthOptions(): { label: string; value: string }[] {
  const options: { label: string; value: string }[] = [];
  const now = new Date();
  for (let i = 0; i <= 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = getMonthKey(d);
    const label = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    options.push({ label: label.charAt(0).toUpperCase() + label.slice(1), value });
  }
  return options;
}

function exportCSV(data: Decaissement[]) {
  const headers = ["Date", "Référence", "Catégorie", "Fournisseur", "Description", "Montant", "Mode", "Notes"];
  const rows = data.map((r) => [
    r.date,
    r.reference,
    r.categoryName || "",
    r.supplier || "",
    r.description,
    r.amount,
    r.paymentMethod,
    r.notes || "",
  ]);
  const csv = [headers, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `decaissements-${getMonthKey()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function RapportDecaissement() {
  const { toast } = useToast();
  const monthOptions = useMemo(() => buildMonthOptions(), []);
  const [month, setMonth] = useState(getMonthKey());
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<Decaissement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Decaissement>>({});
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ month });
      if (category) params.set("category", category);
      if (search) params.set("search", search);
      const res = await fetch(`/api/decaissements?${params}`);
      if (res.ok) {
        const json = await res.json();
        setData(Array.isArray(json) ? json : json.data ?? []);
      }
    } catch {
      toast("Erreur lors du chargement", "error");
    } finally {
      setLoading(false);
    }
  }, [month, category, search, toast]);

  useEffect(() => {
    const timeout = setTimeout(fetchData, 300);
    return () => clearTimeout(timeout);
  }, [fetchData]);

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/decaissements/${id}`, { method: "DELETE" });
      if (res.ok) {
        setData((prev) => prev.filter((e) => e.id !== id));
        toast("Décaissement supprimé");
      } else {
        toast("Erreur lors de la suppression", "error");
      }
    } catch {
      toast("Erreur lors de la suppression", "error");
    }
    setDeletingId(null);
  };

  const startEdit = (row: Decaissement) => {
    setEditingId(row.id);
    setEditForm({
      date: row.date,
      description: row.description,
      supplier: row.supplier || "",
      amount: row.amount,
      paymentMethod: row.paymentMethod,
      notes: row.notes || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    try {
      const res = await fetch(`/api/decaissements/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        toast("Décaissement modifié");
        setEditingId(null);
        fetchData();
      } else {
        toast("Erreur lors de la modification", "error");
      }
    } catch {
      toast("Erreur lors de la modification", "error");
    }
  };

  const total = data.reduce((s, e) => s + parseFloat(e.amount), 0);
  const count = data.length;
  const totalCarte = data
    .filter((e) => e.paymentMethod === "Carte bancaire")
    .reduce((s, e) => s + parseFloat(e.amount), 0);
  const totalEspeces = data
    .filter((e) => e.paymentMethod === "Espèces")
    .reduce((s, e) => s + parseFloat(e.amount), 0);

  const categories = useMemo(() => {
    const set = new Set(data.map((e) => e.categoryName).filter(Boolean));
    return Array.from(set).sort();
  }, [data]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-brown-dark">
            Rapport D&eacute;caissement
          </h1>
          <p className="mt-1 text-sm text-brown">
            D&eacute;tail de toutes les d&eacute;penses
          </p>
        </div>
        {data.length > 0 && (
          <button
            onClick={() => exportCSV(data)}
            className="flex items-center gap-2 rounded-lg border border-cream-dark bg-white px-4 py-2 text-sm font-medium text-brown-dark transition-colors hover:bg-cream-dark"
          >
            <span>&#8681;</span> Exporter CSV
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher..."
          className="flex-1 rounded-lg border border-cream-dark bg-white px-3 py-2.5 text-sm text-brown-dark outline-none focus:border-gold focus:ring-1 focus:ring-gold"
        />
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-lg border border-cream-dark bg-white px-3 py-2.5 text-sm text-brown-dark outline-none focus:border-gold focus:ring-1 focus:ring-gold"
        >
          {monthOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-cream-dark bg-white px-3 py-2.5 text-sm text-brown-dark outline-none focus:border-gold focus:ring-1 focus:ring-gold"
        >
          <option value="">Toutes cat&eacute;gories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="rounded-xl border border-cream-dark bg-white p-4 sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-brown sm:text-xs">
            Total D&eacute;caissements
          </p>
          <p className="mt-2 font-[family-name:var(--font-heading)] text-xl font-bold text-red sm:text-2xl">
            {loading ? "..." : formatMAD(total)}
          </p>
        </div>
        <div className="rounded-xl border border-cream-dark bg-white p-4 sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-brown sm:text-xs">
            Nombre d&apos;&eacute;critures
          </p>
          <p className="mt-2 font-[family-name:var(--font-heading)] text-xl font-bold text-brown-dark sm:text-2xl">
            {loading ? "..." : count}
          </p>
        </div>
        <div className="rounded-xl border border-cream-dark bg-white p-4 sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-brown sm:text-xs">
            Carte Bancaire
          </p>
          <p className="mt-2 font-[family-name:var(--font-heading)] text-xl font-bold text-brown-dark sm:text-2xl">
            {loading ? "..." : formatMAD(totalCarte)}
          </p>
        </div>
        <div className="rounded-xl border border-cream-dark bg-white p-4 sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-brown sm:text-xs">
            Esp&egrave;ces
          </p>
          <p className="mt-2 font-[family-name:var(--font-heading)] text-xl font-bold text-brown-dark sm:text-2xl">
            {loading ? "..." : formatMAD(totalEspeces)}
          </p>
        </div>
      </div>

      {/* Delete Confirmation */}
      {deletingId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-brown-dark">Confirmer la suppression</h3>
            <p className="mt-2 text-sm text-brown">
              &Ecirc;tes-vous s&ucirc;r de vouloir supprimer ce d&eacute;caissement ? Cette action est irr&eacute;versible.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setDeletingId(null)}
                className="rounded-lg border border-cream-dark px-4 py-2 text-sm font-medium text-brown hover:bg-cream-dark"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                className="rounded-lg bg-red px-4 py-2 text-sm font-medium text-white hover:bg-red/90"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Panel */}
      {editingId !== null && (
        <div className="rounded-xl border border-gold bg-amber-light p-4">
          <h3 className="mb-3 text-sm font-semibold text-brown-dark">Modifier le d&eacute;caissement</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-brown">Date</label>
              <input
                type="date"
                value={editForm.date || ""}
                onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm text-brown-dark outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-brown">Description</label>
              <input
                type="text"
                value={editForm.description || ""}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm text-brown-dark outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-brown">Fournisseur</label>
              <input
                type="text"
                value={editForm.supplier || ""}
                onChange={(e) => setEditForm((f) => ({ ...f, supplier: e.target.value }))}
                className="w-full rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm text-brown-dark outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-brown">Montant</label>
              <input
                type="number"
                step="0.01"
                value={editForm.amount || ""}
                onChange={(e) => setEditForm((f) => ({ ...f, amount: e.target.value }))}
                className="w-full rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm text-brown-dark outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-brown">Mode de r&egrave;glement</label>
              <select
                value={editForm.paymentMethod || ""}
                onChange={(e) => setEditForm((f) => ({ ...f, paymentMethod: e.target.value }))}
                className="w-full rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm text-brown-dark outline-none focus:border-gold"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-brown">Notes</label>
              <input
                type="text"
                value={editForm.notes || ""}
                onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm text-brown-dark outline-none focus:border-gold"
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={() => setEditingId(null)}
              className="rounded-lg border border-cream-dark px-4 py-2 text-sm font-medium text-brown hover:bg-cream-dark"
            >
              Annuler
            </button>
            <button
              onClick={handleSaveEdit}
              className="rounded-lg bg-green px-4 py-2 text-sm font-medium text-white hover:bg-green/90"
            >
              Enregistrer
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <p className="py-8 text-center text-sm text-brown">Chargement...</p>
      ) : data.length === 0 ? (
        <p className="rounded-xl border border-cream-dark bg-white py-10 text-center text-sm text-brown">
          Aucun d&eacute;caissement trouv&eacute;
        </p>
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead>
              <tr className="border-b border-cream-dark">
                <th className="pb-3 pr-3 text-xs font-semibold uppercase tracking-wide text-brown">Date</th>
                <th className="pb-3 pr-3 text-xs font-semibold uppercase tracking-wide text-brown">R&eacute;f.</th>
                <th className="pb-3 pr-3 text-xs font-semibold uppercase tracking-wide text-brown">Cat&eacute;gorie</th>
                <th className="pb-3 pr-3 text-xs font-semibold uppercase tracking-wide text-brown">Fournisseur</th>
                <th className="pb-3 pr-3 text-xs font-semibold uppercase tracking-wide text-brown">Description</th>
                <th className="pb-3 pr-3 text-right text-xs font-semibold uppercase tracking-wide text-brown">Montant</th>
                <th className="pb-3 pr-3 text-xs font-semibold uppercase tracking-wide text-brown">Mode</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wide text-brown">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id} className="border-b border-cream-dark last:border-0">
                  <td className="py-3 pr-3 whitespace-nowrap text-brown-dark">{formatDateShort(row.date)}</td>
                  <td className="py-3 pr-3 whitespace-nowrap text-brown">{row.reference}</td>
                  <td className="py-3 pr-3 whitespace-nowrap">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium ${CATEGORY_COLORS[row.categoryName || ""] ?? "bg-cream-dark text-brown"}`}>
                      {row.categoryName || "\u2014"}
                    </span>
                  </td>
                  <td className="py-3 pr-3 whitespace-nowrap text-brown">{row.supplier || "\u2014"}</td>
                  <td className="py-3 pr-3 max-w-[200px] truncate text-brown-dark">{row.description}</td>
                  <td className="py-3 pr-3 whitespace-nowrap text-right font-semibold text-red">{formatMAD(parseFloat(row.amount))}</td>
                  <td className="py-3 pr-3 whitespace-nowrap text-brown">{row.paymentMethod}</td>
                  <td className="py-3 whitespace-nowrap">
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEdit(row)}
                        className="rounded-md p-1.5 text-brown transition-colors hover:bg-amber-light hover:text-gold"
                        title="Modifier"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                          <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeletingId(row.id)}
                        className="rounded-md p-1.5 text-brown transition-colors hover:bg-red-light hover:text-red"
                        title="Supprimer"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                          <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022 1.005 11.36A2.75 2.75 0 007.77 20h4.46a2.75 2.75 0 002.751-2.689l1.005-11.36.149.022a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 01.78.72l.5 6a.75.75 0 01-1.49.12l-.5-6a.75.75 0 01.71-.84zm3.62.72a.75.75 0 00-1.49-.12l-.5 6a.75.75 0 101.49.12l.5-6z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
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
