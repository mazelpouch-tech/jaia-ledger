import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface BDCData {
  numero: string;
  date: string;
  clientOrSupplier: string;
  clientLabel: string;
  articles: {
    description: string;
    quantite: number;
    prixUnitaireHT: number;
    tauxTVA: number;
  }[];
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  type: "recette" | "depense";
}

function formatMADPdf(amount: number): string {
  return amount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " MAD";
}

export function generateBDCPdf(data: BDCData) {
  const doc = new jsPDF();
  const gold = [196, 151, 59] as const;
  const brownDark = [61, 46, 30] as const;
  const brown = [92, 74, 50] as const;

  // Header
  doc.setFontSize(24);
  doc.setTextColor(...brownDark);
  doc.text("RIAD JA\u00cfA", 14, 25);

  doc.setFontSize(10);
  doc.setTextColor(...brown);
  doc.text("Derb ..., M\u00e9dina, Marrakech 40000, Maroc", 14, 32);

  // BDC Title
  doc.setFontSize(16);
  doc.setTextColor(...gold);
  const title = data.type === "recette" ? "Bon de Commande - Recette" : "Bon de Commande - D\u00e9pense";
  doc.text(title, 14, 48);

  // BDC Info
  doc.setFontSize(10);
  doc.setTextColor(...brownDark);
  doc.text(`N\u00b0 : ${data.numero}`, 14, 58);
  doc.text(`Date : ${data.date}`, 14, 64);
  doc.text(`${data.clientLabel} : ${data.clientOrSupplier}`, 14, 70);

  // Line
  doc.setDrawColor(...gold);
  doc.setLineWidth(0.5);
  doc.line(14, 75, 196, 75);

  // Table
  autoTable(doc, {
    startY: 80,
    head: [["Description", "Qt\u00e9", "P.U. HT (MAD)", "TVA %", "Total HT (MAD)"]],
    body: data.articles.map((a) => [
      a.description,
      String(a.quantite),
      formatMADPdf(a.prixUnitaireHT),
      `${a.tauxTVA}%`,
      formatMADPdf(a.quantite * a.prixUnitaireHT),
    ]),
    styles: {
      fontSize: 9,
      textColor: [...brownDark],
      lineColor: [240, 233, 223],
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: [...gold],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [250, 246, 241],
    },
    theme: "grid",
  });

  // Totals
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable?.finalY || 120;
  const totalsY = finalY + 10;

  doc.setFontSize(10);
  doc.setTextColor(...brown);
  doc.text("Total HT :", 130, totalsY);
  doc.setTextColor(...brownDark);
  doc.text(formatMADPdf(data.totalHT), 170, totalsY, { align: "right" });

  doc.setTextColor(...brown);
  doc.text("Total TVA :", 130, totalsY + 7);
  doc.setTextColor(...brownDark);
  doc.text(formatMADPdf(data.totalTVA), 170, totalsY + 7, { align: "right" });

  doc.setDrawColor(...gold);
  doc.line(130, totalsY + 10, 170, totalsY + 10);

  doc.setFontSize(12);
  doc.setTextColor(...gold);
  doc.text("Total TTC :", 130, totalsY + 18);
  doc.setTextColor(...brownDark);
  doc.text(formatMADPdf(data.totalTTC), 170, totalsY + 18, { align: "right" });

  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(...brown);
  doc.text("Riad Ja\u00efa - Marrakech | contact@riadjaia.com", 14, pageHeight - 10);
  doc.text(`G\u00e9n\u00e9r\u00e9 le ${new Date().toLocaleDateString("fr-FR")}`, 170, pageHeight - 10, { align: "right" });

  doc.save(`${data.numero}.pdf`);
}
