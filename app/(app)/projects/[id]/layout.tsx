import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";
import { canSeeModule, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ProjectTabs } from "@/components/ProjectTabs";
import { StatusSelect } from "@/components/StatusSelect";
import { MODULE_KEYS, type Project } from "@/types/database";

const STATUS_LABEL = { gepland: "Gepland", lopend: "Lopend", afgerond: "Afgerond" };

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const current = await requireUser();
  const supabase = createClient();

  const { data: project } = await supabase.from("projects").select("*").eq("id", params.id).single();
  if (!project) notFound();
  const p = project as Project;

  let clientName: string | null = null;
  if (p.client_id) {
    const { data: client } = await supabase.from("clients").select("name").eq("id", p.client_id).single();
    clientName = client?.name ?? null;
  }

  const visibleTabs = MODULE_KEYS.filter((key) => canSeeModule(current, key));

  return (
    <div>
      <div className="project-header">
        <div className="header-grid-texture" />
        <div className="header-top">
          <div>
            <div className="header-eyebrow">Project</div>
            <h1>{p.name}</h1>
            <div className="header-meta">
              {clientName && (
                <span>
                  <MapPin size={12} /> {clientName}
                </span>
              )}
              <span className={"pill pill-" + p.status}>{STATUS_LABEL[p.status]}</span>
            </div>
          </div>
          <div className="header-right">
            {current.profile.role === "eigenaar" && <StatusSelect projectId={p.id} status={p.status} />}
          </div>
        </div>
      </div>

      {p.address && (
        <div className="address-card">
          <MapPin size={16} />
          <div className="address-body">
            <div className="address-label">Adres</div>
            <div className="address-value">{p.address}</div>
          </div>
          <a
            className="address-link"
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address)}`}
            target="_blank"
            rel="noreferrer"
          >
            Route
          </a>
        </div>
      )}

      <ProjectTabs projectId={p.id} visibleTabs={visibleTabs} />
      {children}
    </div>
  );
}
