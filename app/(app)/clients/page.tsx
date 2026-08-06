import { ShieldCheck } from "lucide-react";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ClientRow } from "@/components/ClientRow";
import { InviteClientForm } from "@/components/InviteClientForm";
import type { Client, Project } from "@/types/database";

export default async function ClientsPage() {
  await requireOwner();
  const supabase = createClient();
  const [{ data: clients }, { data: projects }] = await Promise.all([
    supabase.from("clients").select("*").order("name"),
    supabase.from("projects").select("id,name,client_id").order("name"),
  ]);
  const clientList = (clients ?? []) as Client[];
  const projectList = (projects ?? []) as Pick<Project, "id" | "name" | "client_id">[];

  return (
    <div className="panel access-panel">
      <div className="hint-bar">
        <ShieldCheck size={14} style={{ display: "inline", marginRight: 6, verticalAlign: -2 }} />
        Klanten loggen in met hun eigen e-mailadres en zien alleen hun eigen gekoppelde project(en).
      </div>

      <div className="access-block">
        <div className="access-block-title">Klanten</div>
        {clientList.length === 0 && <div className="empty-hint">Nog geen klanten uitgenodigd.</div>}
        <div className="access-list">
          {clientList.map((c) => (
            <ClientRow key={c.id} client={c} projects={projectList} />
          ))}
        </div>
      </div>

      <InviteClientForm />
    </div>
  );
}
