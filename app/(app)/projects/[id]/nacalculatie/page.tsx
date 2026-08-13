import { notFound } from "next/navigation";
import { canSeeCalc, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CalcPanel } from "@/components/CalcPanel";
import type { CostItem, ExtraWork, HourEntry, Project, TeamMember } from "@/types/database";

export default async function NacalculatiePage({ params }: { params: { id: string } }) {
  const current = await requireUser();
  if (!canSeeCalc(current)) notFound();

  const supabase = createClient();
  const [{ data: project }, { data: extraWork }, { data: hours }, { data: teamMembers }, { data: costItems }] = await Promise.all([
    supabase.from("projects").select("*").eq("id", params.id).single(),
    supabase.from("extra_work").select("*").eq("project_id", params.id).eq("status", "akkoord"),
    supabase.from("hours").select("*").eq("project_id", params.id),
    supabase.from("team_members").select("id,name,hourly_rate"),
    supabase.from("cost_items").select("*").eq("project_id", params.id).order("created_at"),
  ]);

  if (!project) notFound();
  const p = project as Project;
  const extraWorkRows = (extraWork ?? []) as ExtraWork[];
  const meerwerkAkkoord = extraWorkRows.filter((w) => w.type === "meerwerk").reduce((s, w) => s + Number(w.amount), 0);
  const minderwerkAkkoord = extraWorkRows.filter((w) => w.type === "minderwerk").reduce((s, w) => s + Number(w.amount), 0);

  const rateById = new Map(
    ((teamMembers ?? []) as Pick<TeamMember, "id" | "name" | "hourly_rate">[]).map((m) => [m.id, { name: m.name, rate: m.hourly_rate }])
  );

  const hourRows = (hours ?? []) as HourEntry[];
  const laborByMember = new Map<string, { name: string; hours: number; rate: number | null; amount: number }>();
  for (const h of hourRows) {
    const info = rateById.get(h.team_member_id);
    const name = info?.name ?? "Onbekend";
    const rate = info?.rate ?? null;
    const existing = laborByMember.get(h.team_member_id) ?? { name, hours: 0, rate, amount: 0 };
    existing.hours += Number(h.hours);
    existing.amount += rate ? Number(h.hours) * rate : 0;
    laborByMember.set(h.team_member_id, existing);
  }

  return (
    <CalcPanel
      projectId={params.id}
      project={p}
      meerwerkAkkoord={meerwerkAkkoord}
      minderwerkAkkoord={minderwerkAkkoord}
      labor={Array.from(laborByMember.values())}
      costItems={(costItems ?? []) as CostItem[]}
      isLocked={!!p.delivery_signed_at}
    />
  );
}
