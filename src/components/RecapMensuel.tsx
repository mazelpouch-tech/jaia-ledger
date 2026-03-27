"use client";

import { useState, useEffect } from "react";
import { formatMAD } from "@/lib/format";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface MonthlySummary {
  month: string;
  monthLabel: string;
  totalEnc: number;
  totalDec: number;
  solde: number;
  margin: number;
}

export default function RecapMensuel() {
  const [data, setData] = useState<MonthlySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch("/api/stats/monthly");
        if (res.ok) {
          const json = await res.json();
          setData(Array.isArray(json) ? json : json.data ?? []);
        }
      } catch {
        // silently handle
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const totalEnc = data.reduce((s, r) => s + r.totalEnc, 0);
  const totalDec = data.reduce((s, r) => s + r.totalDec, 0);
  const soldeCumule = totalEnc - totalDec;

  function handleExportPdf() {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(60, 46, 30);
    doc.text("Récapitulatif Mensuel", 14, 22);
    doc.setFontSize(10);
    doc.setTextColor(92, 74, 50);
    doc.text("Riad JAÏA", 14, 30);

    const tableData = data.map((row) => {
      const solde = row.totalEnc - row.totalDec;
      const marge = row.totalEnc > 0 ? ((solde / row.totalEnc) * 100).toFixed(1) + "%" : "0%";
      return [
        row.monthLabel || row.month,
        formatMAD(row.totalEnc),
        formatMAD(row.totalDec),
        (solde >= 0 ? "+" : "") + formatMAD(solde),
        marge,
      ];
    });

    // Add totals row
    tableData.push([
      "TOTAL",
      formatMAD(totalEnc),
      formatMAD(totalDec),
      (soldeCumule >= 0 ? "+" : "") + formatMAD(soldeCumule),
      totalEnc > 0 ? ((soldeCumule / totalEnc) * 100).toFixed(1) + "%" : "0%",
    ]);

    autoTable(doc, {
      startY: 36,
      head: [["Mois", "Encaissements", "Décaissements", "Solde", "Marge"]],
      body: tableData,
      headStyles: { fillColor: [196, 151, 59], textColor: 255 },
      alternateRowStyles: { fillColor: [250, 246, 241] },
      styles: { fontSize: 9 },
      didParseCell: (data) => {
        if (data.row.index === tableData.length - 1) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [240, 233, 223];
        }
      },
    });

    doc.save("recap-mensuel-riad-jaia.pdf");
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-brown-dark">
            R&eacute;capitulatif Mensuel
          </h1>
          <p className="mt-1 text-sm text-brown">
            Synth&egrave;se mois par mois
          </p>
        </div>
        <button
          onClick={handleExportPdf}
          disabled={loading || data.length === 0}
          className="inline-flex items-center gap-2 rounded-lg border border-gold bg-gold/10 px-4 py-2.5 text-sm font-semibold text-gold transition-colors hover:bg-gold hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          Exporter PDF
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <div className="rounded-xl border border-cream-dark bg-white p-4 sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-brown sm:text-xs">
            Total Encaissements
          </p>
          <p className="mt-2 font-[family-name:var(--font-heading)] text-xl font-bold text-green sm:text-2xl">
            {loading ? "..." : formatMAD(totalEnc)}
          </p>
        </div>
        <div className="rounded-xl border border-cream-dark bg-white p-4 sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-brown sm:text-xs">
            Total D&eacute;caissements
          </p>
          <p className="mt-2 font-[family-name:var(--font-heading)] text-xl font-bold text-red sm:text-2xl">
            {loading ? "..." : formatMAD(totalDec)}
          </p>
        </div>
        <div className="rounded-xl border border-cream-dark bg-white p-4 sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-brown sm:text-xs">
            Solde Cumul&eacute;
          </p>
          <p
            className={`mt-2 font-[family-name:var(--font-heading)] text-xl font-bold sm:text-2xl ${
              soldeCumule >= 0 ? "text-green" : "text-red"
            }`}
          >
            {loading ? "..." : (soldeCumule >= 0 ? "+" : "") + formatMAD(soldeCumule)}
          </p>
        </div>
      </div>

      {/* Monthly Table */}
      {loading ? (
        <p className="py-8 text-center text-sm text-brown">Chargement...</p>
      ) : data.length === 0 ? (
        <p className="rounded-xl border border-cream-dark bg-white py-10 text-center text-sm text-brown">
          Aucune donn&eacute;e disponible
        </p>
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead>
              <tr className="border-b border-cream-dark">
                <th className="pb-3 pr-3 text-xs font-semibold uppercase tracking-wide text-brown">
                  Mois
                </th>
                <th className="pb-3 pr-3 text-right text-xs font-semibold uppercase tracking-wide text-brown">
                  Encaissements
                </th>
                <th className="pb-3 pr-3 text-right text-xs font-semibold uppercase tracking-wide text-brown">
                  D&eacute;caissements
                </th>
                <th className="pb-3 pr-3 text-right text-xs font-semibold uppercase tracking-wide text-brown">
                  Solde
                </th>
                <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wide text-brown">
                  Marge
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => {
                const rowSolde = row.totalEnc - row.totalDec;
                const rowMarge =
                  row.totalEnc > 0
                    ? ((rowSolde / row.totalEnc) * 100)
                    : 0;
                return (
                  <tr
                    key={row.month}
                    className="border-b border-cream-dark last:border-0"
                  >
                    <td className="py-3 pr-3 whitespace-nowrap font-medium text-brown-dark">
                      {row.monthLabel ||
                        new Date(row.month + "-01").toLocaleDateString("fr-FR", {
                          month: "long",
                          year: "numeric",
                        })}
                    </td>
                    <td className="py-3 pr-3 whitespace-nowrap text-right font-semibold text-green">
                      {formatMAD(row.totalEnc)}
                    </td>
                    <td className="py-3 pr-3 whitespace-nowrap text-right font-semibold text-red">
                      {formatMAD(row.totalDec)}
                    </td>
                    <td
                      className={`py-3 pr-3 whitespace-nowrap text-right font-semibold ${
                        rowSolde >= 0 ? "text-green" : "text-red"
                      }`}
                    >
                      {rowSolde >= 0 ? "+" : ""}
                      {formatMAD(rowSolde)}
                    </td>
                    <td
                      className={`py-3 whitespace-nowrap text-right font-medium ${
                        rowMarge >= 0 ? "text-green" : "text-red"
                      }`}
                    >
                      {rowMarge.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
