import { canSeeModule, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { NotesPanel } from "@/components/NotesPanel";
import type { Note } from "@/types/database";

export default async function NotitiesPage({ params }: { params: { id: string } }) {
  const current = await requireUser();
  if (!canSeeModule(current, "notities")) {
    return <div className="empty-hint">Je hebt geen toegang tot deze module.</div>;
  }

  const supabase = createClient();
  const { data: notes } = await supabase
    .from("notes")
    .select("*")
    .eq("project_id", params.id)
    .order("created_at", { ascending: false });

  return <NotesPanel projectId={params.id} role={current.profile.role} currentUserId={current.id} notes={(notes ?? []) as Note[]} />;
}
