import { ShieldCheck } from "lucide-react";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getInviteStatuses } from "@/lib/inviteStatus";
import { ClientRow } from "@/components/ClientRow";
import { InviteClientForm } from "@/components/InviteClientForm";
import type { InviteStatus } from "@/lib/inviteStatus";
import type { Client, Project } from "@/types/database";

export default async function ClientsPage() {
  await requireOwner();
  const supabase = createClient();
  const [{ data: clients }, { data: projects }, { data: extraAccess }, { data: profiles }] = await Promise.all([
    supabase.from("clients").select("*").order("name"),
    supabase.from("projects").select("id,name,client_id").order("name"),
    supabase.from("project_client_access").select("project_id,client_id"),
    supabase.from("profiles").select("id,client_id").not("client_id", "is", null),
  ]);
  const clientList = (clients ?? []) as Client[];
  const profileByClientId: Record<string, string> = {};
  (profiles ?? []).forEach((p) => {
    if (p.client_id) profileByClientId[p.client_id as string] = p.id as string;
  });
  const inviteStatuses = await getInviteStatuses(Object.values(profileByClientId));
  const inviteStatusByClientId: Record<string, InviteStatus> = {};
  Object.entries(profileByClientId).forEach(([clientId, profileId]) => {
    if (inviteStatuses[profileId]) inviteStatusByClientId[clientId] = inviteStatuses[profileId];
  });
  const rawProjects = (projects ?? []) as Pick<Project, "id" | "name" | "client_id">[];
  const projectList = rawProjects.map((p) => ({
    id: p.id,
    name: p.name,
    clientIds: [
      ...(p.client_id ? [p.client_id] : []),
      ...(extraAccess ?? []).filter((a) => a.project_id === p.id).map((a) => a.client_id as string),
    ],
  }));

  return (
    <div className="panel access-panel">
      <div className="header-eyebrow">Beheer</div>
      <h1 className="page-title">Klanten</h1>
      <div className="hint-bar">
        <ShieldCheck size={14} style={{ display: "inline", marginRight: 6, verticalAlign: -2 }} />
        Klanten loggen in met hun eigen e-mailadres en zien alleen hun eigen gekoppelde project(en).
      </div>

      <div className="access-block">
        <div className="access-block-title">Klanten</div>
        {clientList.length === 0 && <div className="empty-hint">Nog geen klanten uitgenodigd.</div>}
        <div className="access-list">
          {clientList.map((c) => (
            <ClientRow key={c.id} client={c} projects={projectList} inviteStatus={inviteStatusByClientId[c.id]} />
          ))}
        </div>
      </div>

      <InviteClientForm />
    </div>
  );
}
