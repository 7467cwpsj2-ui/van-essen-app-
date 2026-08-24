import { notFound } from "next/navigation";
import { canSeeHours, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { HoursPanel } from "@/components/HoursPanel";
import type { HourEntry, Project, TeamMember } from "@/types/database";

export default async function UrenPage({ params }: { params: { id: string } }) {
  const current = await requireUser();
  if (!canSeeHours(current)) notFound();

  const supabase = createClient();
  const [{ data: entries }, { data: teamMembers }, { data: project }] = await Promise.all([
    supabase.from("hours").select("*").eq("project_id", params.id).order("work_date", { ascending: false }),
    supabase.from("team_members").select("*").order("name"),
    supabase.from("projects").select("name,delivery_signed_at").eq("id", params.id).single(),
  ]);

  return (
    <HoursPanel
      target={{ projectId: params.id }}
      targetName={(project as Pick<Project, "name" | "delivery_signed_at"> | null)?.name ?? "project"}
      role={current.profile.role}
      currentTeamMemberId={current.profile.team_member_id}
      isLocked={!!(project as Pick<Project, "delivery_signed_at"> | null)?.delivery_signed_at}
      entries={(entries ?? []) as HourEntry[]}
      teamMembers={((teamMembers ?? []) as TeamMember[]).map((m) => ({ id: m.id, name: m.name }))}
    />
  );
}
