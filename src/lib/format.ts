export function formatMAD(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + " MAD";
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function getCurrentMonth(): string {
  return new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

export function getMonthKey(date?: Date): string {
  const d = date || new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function getTodayISO(): string {
  return new Date().toISOString().split("T")[0];
}
