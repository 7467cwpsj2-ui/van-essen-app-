import { notFound } from "next/navigation";
import { canSeeSubsidies, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadAuthorizationData } from "@/lib/authorizationData";
import { AuthorizationPanel } from "@/components/AuthorizationPanel";

export default async function MachtigingPage({ params }: { params: { id: string } }) {
  const current = await requireUser();
  const supabase = createClient();
  const data = await loadAuthorizationData(supabase, params.id);
  if (!data) notFound();

  // Eigenaar/team altijd toegang (om aan te vragen/beheren); de klant
  // alleen zodra er echt iets voor hem/haar klaarstaat om te tekenen.
  if (!canSeeSubsidies(current) && !(current.profile.role === "klant" && data.authorization)) notFound();

  return (
    <AuthorizationPanel
      projectId={params.id}
      role={current.profile.role}
      clientName={data.clientName}
      projectAddress={data.project.address}
      company={data.company}
      authorization={data.authorization}
    />
  );
}
