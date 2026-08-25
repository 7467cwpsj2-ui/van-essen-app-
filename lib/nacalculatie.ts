import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { amountExclVat, type CostItem, type ExtraWorkVatType, type ProjectStatus } from "@/types/database";

const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  gepland: "Gepland",
  lopend: "Lopend",
  afgerond: "Afgerond",
};

export interface NacalculatieLaborRow {
  memberId: string;
  name: string;
  hours: number;
  rate: number | null;
  vatType: ExtraWorkVatType | null;
  amount: number;
}

export interface NacalculatieRow {
  id: string;
  kind: "project" | "klus";
  name: string;
  statusLabel: string;
  isOpen: boolean;
  begroot: number;
  vatType: ExtraWorkVatType;
  werkelijk: number;
  marge: number;
  hasPrice: boolean;
  // Projecten linken door naar hun eigen, volledige nacalculatiepagina
  // (met meerwerk/minderwerk); losse klussen hebben dat niet en klappen
  // in plaats daarvan inline open, met labor/costItems hieronder gevuld.
  href: string | null;
  labor: NacalculatieLaborRow[];
  costItems: CostItem[];
}

// Alle projecten én losse klussen samen, met begroot/werkelijk/marge —
// zodat de eigenaar niet elk project en elke klus apart hoeft te openen
// om te zien hoe de nacalculatie ervoor staat. Arbeidskosten (uren ×
// uurtarief) en overige kosten worden in bulk voor alles tegelijk
// opgehaald i.p.v. per project/klus, om dezelfde reden als eerder bij
// getProjectsWithProgress() — dit voorkomt tientallen losse queries.
export const getNacalculatieOverview = cache(async (): Promise<NacalculatieRow[]> => {
  const supabase = createClient();
  const [{ data: projects }, { data: quickJobs }, { data: extraWork }, { data: hours }, { data: costItemsData }, { data: teamMembers }] =
    await Promise.all([
      supabase.from("projects").select("id,name,status,quote_amount,quote_vat_type"),
      supabase.from("quick_jobs").select("id,title,done,price,price_vat_type").eq("kind", "klus"),
      supabase.from("extra_work").select("project_id,type,amount").eq("status", "akkoord"),
      supabase.from("hours").select("project_id,quick_job_id,team_member_id,hours"),
      supabase.from("cost_items").select("*"),
      supabase.from("team_members").select("id,name,hourly_rate,hourly_rate_vat_type"),
    ]);

  const memberById = new Map(
    (teamMembers ?? []).map((m) => [
      m.id as string,
      { name: m.name as string, rate: m.hourly_rate as number | null, vatType: m.hourly_rate_vat_type as ExtraWorkVatType },
    ])
  );

  const laborByProject = new Map<string, number>();
  const laborByQuickJob = new Map<string, Map<string, NacalculatieLaborRow>>();
  for (const h of hours ?? []) {
    const memberId = h.team_member_id as string;
    const info = memberById.get(memberId);
    const rateExcl = info?.rate != null ? amountExclVat(info.rate, info.vatType ?? "excl") : null;
    const amount = rateExcl != null ? rateExcl * Number(h.hours) : 0;
    if (h.project_id) {
      const pid = h.project_id as string;
      laborByProject.set(pid, (laborByProject.get(pid) ?? 0) + amount);
    } else if (h.quick_job_id) {
      const qid = h.quick_job_id as string;
      if (!laborByQuickJob.has(qid)) laborByQuickJob.set(qid, new Map());
      const memberMap = laborByQuickJob.get(qid)!;
      const existing = memberMap.get(memberId) ?? {
        memberId,
        name: info?.name ?? "Onbekend",
        hours: 0,
        rate: info?.rate ?? null,
        vatType: info?.rate != null ? info.vatType ?? "excl" : null,
        amount: 0,
      };
      existing.hours += Number(h.hours);
      existing.amount += amount;
      memberMap.set(memberId, existing);
    }
  }

  const costRowsAll = (costItemsData ?? []) as CostItem[];
  const costByProject = new Map<string, number>();
  const costItemsByQuickJob = new Map<string, CostItem[]>();
  for (const c of costRowsAll) {
    if (c.project_id) {
      costByProject.set(c.project_id, (costByProject.get(c.project_id) ?? 0) + Number(c.amount));
    } else if (c.quick_job_id) {
      if (!costItemsByQuickJob.has(c.quick_job_id)) costItemsByQuickJob.set(c.quick_job_id, []);
      costItemsByQuickJob.get(c.quick_job_id)!.push(c);
    }
  }

  const meerwerkByProject = new Map<string, number>();
  const minderwerkByProject = new Map<string, number>();
  for (const w of extraWork ?? []) {
    const pid = w.project_id as string;
    const map = w.type === "meerwerk" ? meerwerkByProject : minderwerkByProject;
    map.set(pid, (map.get(pid) ?? 0) + Number(w.amount));
  }

  const rows: NacalculatieRow[] = [];
  for (const p of projects ?? []) {
    const pid = p.id as string;
    const begroot = Number(p.quote_amount) + (meerwerkByProject.get(pid) ?? 0) - (minderwerkByProject.get(pid) ?? 0);
    const werkelijk = (laborByProject.get(pid) ?? 0) + (costByProject.get(pid) ?? 0);
    rows.push({
      id: pid,
      kind: "project",
      name: p.name as string,
      statusLabel: PROJECT_STATUS_LABEL[p.status as ProjectStatus] ?? (p.status as string),
      isOpen: p.status !== "afgerond",
      begroot,
      vatType: p.quote_vat_type as ExtraWorkVatType,
      werkelijk,
      marge: begroot - werkelijk,
      hasPrice: Number(p.quote_amount) > 0,
      href: `/projects/${pid}/nacalculatie`,
      labor: [],
      costItems: [],
    });
  }
  for (const j of quickJobs ?? []) {
    const jid = j.id as string;
    const labor = Array.from((laborByQuickJob.get(jid) ?? new Map()).values());
    const jobCostItems = costItemsByQuickJob.get(jid) ?? [];
    const laborTotal = labor.reduce((s, l) => s + l.amount, 0);
    const costTotal = jobCostItems.reduce((s, c) => s + Number(c.amount), 0);
    const begroot = Number(j.price);
    const werkelijk = laborTotal + costTotal;
    rows.push({
      id: jid,
      kind: "klus",
      name: j.title as string,
      statusLabel: j.done ? "Afgerond" : "Lopend",
      isOpen: !j.done,
      begroot,
      vatType: j.price_vat_type as ExtraWorkVatType,
      werkelijk,
      marge: begroot - werkelijk,
      hasPrice: begroot > 0,
      href: null,
      labor,
      costItems: jobCostItems,
    });
  }

  // Nog niets ingevuld staat onderaan (niets om te sorteren op) — van de
  // rest staat de slechtste marge bovenaan, want dat is precies waar de
  // eigenaar het eerst naar wil kijken.
  rows.sort((a, b) => {
    if (a.hasPrice !== b.hasPrice) return a.hasPrice ? -1 : 1;
    if (!a.hasPrice) return a.name.localeCompare(b.name, "nl");
    return a.marge - b.marge;
  });

  return rows;
});
