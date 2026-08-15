import type { WarrantyUnit } from "@/types/database";

// Rekent een garantieperiode om naar een concrete einddatum, gerekend
// vanaf de daadwerkelijke ondertekeningsdatum (of anders de geplande
// opleverdatum als de oplevering nog niet is ondertekend).
export function warrantyEndDate(baseDateIso: string | null, amount: number, unit: WarrantyUnit): string | null {
  if (!baseDateIso || !(amount > 0)) return null;
  const d = new Date(baseDateIso.slice(0, 10) + "T00:00:00Z");
  if (unit === "weken") d.setUTCDate(d.getUTCDate() + amount * 7);
  else if (unit === "maanden") d.setUTCMonth(d.getUTCMonth() + amount);
  else d.setUTCFullYear(d.getUTCFullYear() + amount);
  return d.toISOString().slice(0, 10);
}
