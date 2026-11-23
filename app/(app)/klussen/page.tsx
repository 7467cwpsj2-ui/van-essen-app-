import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getQuickJobsList } from "@/lib/data";
import { LosseKlussenListPanel } from "@/components/LosseKlussenListPanel";

export default async function KlussenListPage() {
  const current = await requireUser();
  if (current.profile.role === "klant") notFound();

  const teamMemberId = current.profile.role === "team" ? current.teamMember?.id ?? null : null;
  const jobs = await getQuickJobsList(teamMemberId);
  return <LosseKlussenListPanel jobs={jobs} />;
}
