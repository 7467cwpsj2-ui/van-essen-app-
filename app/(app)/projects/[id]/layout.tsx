import { notFound } from "next/navigation";
import { Lock, MapPin } from "lucide-react";
import { canSeeModule, canSeePrivateChat, requireUser } from "@/lib/auth";
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
  const showPrivateChat = canSeePrivateChat(current);
  const isLocked = !!p.delivery_signed_at;

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
              {isLocked && (
                <span className="pill pill-afgerond">
                  <Lock size={10} style={{ display: "inline", marginRight: 3, verticalAlign: -1 }} /> Vergrendeld
                </span>
              )}
            </div>
          </div>
          <div className="header-right">
            {current.profile.role === "eigenaar" && !isLocked && <StatusSelect projectId={p.id} status={p.status} />}
          </div>
        </div>
      </div>

      {isLocked && (
        <div className="hint-bar">
          <Lock size={13} style={{ display: "inline", marginRight: 6, verticalAlign: -2 }} />
          Het opleverdossier is ondertekend door {p.delivery_signed_by} — dit project ligt permanent vast, niemand kan er nog iets aan
          wijzigen.
        </div>
      )}

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

      <ProjectTabs projectId={p.id} visibleTabs={visibleTabs} showPrivateChat={showPrivateChat} />
      {children}
    </div>
  );
}
