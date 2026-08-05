import { notFound } from "next/navigation";
import { canSeeCalc, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CalcPanel } from "@/components/CalcPanel";
import type { ExtraWork, Project } from "@/types/database";

export default async function NacalculatiePage({ params }: { params: { id: string } }) {
  const current = await requireUser();
  if (!canSeeCalc(current)) notFound();

  const supabase = createClient();
  const [{ data: project }, { data: extraWork }] = await Promise.all([
    supabase.from("projects").select("*").eq("id", params.id).single(),
    supabase.from("extra_work").select("*").eq("project_id", params.id).eq("status", "akkoord"),
  ]);

  if (!project) notFound();
  const p = project as Project;
  const extraWorkRows = (extraWork ?? []) as ExtraWork[];
  const meerwerkAkkoord = extraWorkRows.filter((w) => w.type === "meerwerk").reduce((s, w) => s + Number(w.amount), 0);
  const minderwerkAkkoord = extraWorkRows.filter((w) => w.type === "minderwerk").reduce((s, w) => s + Number(w.amount), 0);

  return (
    <CalcPanel
      projectId={params.id}
      project={p}
      meerwerkAkkoord={meerwerkAkkoord}
      minderwerkAkkoord={minderwerkAkkoord}
      isLocked={!!p.delivery_signed_at}
    />
  );
}
