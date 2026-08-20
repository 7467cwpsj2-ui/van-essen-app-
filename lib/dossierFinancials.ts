import type { ExtraWork, ExtraWorkVatType, Project } from "@/types/database";

export interface DossierFinancialSection {
  vatType: ExtraWorkVatType;
  isQuoteVatType: boolean;
  quoteAmount: number;
  meerwerk: number;
  minderwerk: number;
  total: number;
}

// Offertebedrag heeft altijd één btw-soort (project.quote_vat_type),
// maar meerwerk-/minderwerkregels kunnen elk hun eigen soort hebben. Die
// bedragen bij elkaar optellen zou appels en peren zijn (zelfde probleem
// als al opgelost in ExtraWorkPanel) — dus per btw-soort een eigen,
// intern kloppend totaal. In de gebruikelijke situatie (alles dezelfde
// btw-soort) levert dit gewoon één sectie op.
export function computeDossierFinancials(project: Project, extraWork: ExtraWork[]): DossierFinancialSection[] {
  const vatTypesPresent = new Set<ExtraWorkVatType>([project.quote_vat_type, ...extraWork.map((w) => w.vat_type)]);
  return (["excl", "incl"] as const)
    .filter((vatType) => vatTypesPresent.has(vatType))
    .map((vatType) => {
      const isQuoteVatType = project.quote_vat_type === vatType;
      const quoteAmount = isQuoteVatType ? Number(project.quote_amount || 0) : 0;
      const meerwerk = extraWork.filter((w) => w.type === "meerwerk" && w.vat_type === vatType).reduce((s, w) => s + Number(w.amount), 0);
      const minderwerk = extraWork.filter((w) => w.type === "minderwerk" && w.vat_type === vatType).reduce((s, w) => s + Number(w.amount), 0);
      return { vatType, isQuoteVatType, quoteAmount, meerwerk, minderwerk, total: quoteAmount + meerwerk - minderwerk };
    });
}
