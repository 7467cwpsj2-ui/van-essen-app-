import { canSeeModule, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ClientChoicesPanel } from "@/components/ClientChoicesPanel";
import type { ClientChoice, Project } from "@/types/database";

export default async function KlantkeuzesPage({ params }: { params: { id: string } }) {
  const current = await requireUser();
  if (!canSeeModule(current, "klantkeuzes")) {
    return <div className="empty-hint">Je hebt geen toegang tot deze module.</div>;
  }

  const supabase = createClient();
  const [{ data: choices }, { data: project }] = await Promise.all([
    supabase.from("client_choices").select("*").eq("project_id", params.id).order("created_at"),
    supabase.from("projects").select("delivery_signed_at").eq("id", params.id).single(),
  ]);

  return (
    <ClientChoicesPanel
      projectId={params.id}
      role={current.profile.role}
      isLocked={!!(project as Pick<Project, "delivery_signed_at"> | null)?.delivery_signed_at}
      choices={(choices ?? []) as ClientChoice[]}
    />
  );
}
