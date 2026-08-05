import { canSeeModule, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
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
  const withSignatures: ExtraWorkWithSignature[] = await Promise.all(
    rows.map(async (w) => {
      let signatureUrl: string | null = null;
      if (w.signature_path) {
        const { data } = await supabase.storage.from("project-files").createSignedUrl(w.signature_path, 3600);
        signatureUrl = data?.signedUrl ?? null;
      }
      return { ...w, signatureUrl };
    })
  );

  return (
    <ExtraWorkPanel
      projectId={params.id}
      role={current.profile.role}
      phases={(phases ?? []) as SchedulePhase[]}
      items={withSignatures}
    />
  );
}
