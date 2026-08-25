import { canSeeModule, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signedUrlMap } from "@/lib/storage";
import { ExtraWorkPanel, type ExtraWorkWithSignature } from "@/components/ExtraWorkPanel";
import type { ExtraWork, SchedulePhase } from "@/types/database";

export default async function MeerwerkPage({ params }: { params: { id: string } }) {
  const current = await requireUser();
  if (!canSeeModule(current, "meerwerk")) {
    return <div className="empty-hint">Je hebt geen toegang tot deze module.</div>;
  }

  const supabase = createClient();
  const [{ data: items }, { data: phases }] = await Promise.all([
    supabase.from("extra_work").select("*").eq("project_id", params.id).order("created_at", { ascending: false }),
    supabase.from("schedule_phases").select("*").eq("project_id", params.id).order("start_date"),
  ]);

  const rows = (items ?? []) as ExtraWork[];
  const urlByPath = await signedUrlMap(supabase, "project-files", [
    ...rows.map((w) => w.signature_path),
    ...rows.map((w) => w.photo_path),
  ]);
  const withSignatures: ExtraWorkWithSignature[] = rows.map((w) => ({
    ...w,
    signatureUrl: (w.signature_path ? urlByPath.get(w.signature_path) : null) ?? null,
    attachmentUrl: (w.photo_path ? urlByPath.get(w.photo_path) : null) ?? null,
  }));

  return (
    <ExtraWorkPanel
      projectId={params.id}
      role={current.profile.role}
      phases={(phases ?? []) as SchedulePhase[]}
      items={withSignatures}
    />
  );
}
