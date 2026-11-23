import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getQuickJobsList } from "@/lib/data";
import { LosseKlussenListPanel } from "@/components/LosseKlussenListPanel";

export default async function KlussenListPage() {
  const current = await requireUser();
  if (current.profile.role === "klant") notFound();

  const jobs = await getQuickJobsList();
  return <LosseKlussenListPanel jobs={jobs} />;
}
