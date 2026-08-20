import { notFound } from "next/navigation";
import { Lock, MapPin, Search } from "lucide-react";
import { canSeeCalc, canSeeHours, canSeeModule, canSeePrivateChat, canSeeSubsidies, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getProjectClientName } from "@/lib/clientNames";
import { ProjectTabs } from "@/components/ProjectTabs";
import { StatusSelect } from "@/components/StatusSelect";
import { RouteMenu } from "@/components/RouteMenu";
import { DeleteProjectButton } from "@/components/DeleteProjectButton";
import { EditProjectButton } from "@/components/EditProjectButton";
import { CoverPhotoControls } from "@/components/CoverPhotoControls";
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

  const clientName = await getProjectClientName(supabase, p.id, p.client_id);

  let coverPhotoUrl: string | null = null;
  if (p.cover_photo_path) {
    const { data: signed } = await supabase.storage.from("project-files").createSignedUrl(p.cover_photo_path, 3600);
    coverPhotoUrl = signed?.signedUrl ?? null;
  }

  const visibleTabs = MODULE_KEYS.filter((key) => canSeeModule(current, key));
  const showPrivateChat = canSeePrivateChat(current);
  const showHours = canSeeHours(current);
  const showCalc = canSeeCalc(current);
  const showSubsidies = canSeeSubsidies(current);
  let showAuthorization = showSubsidies;
  if (!showAuthorization && current.profile.role === "klant") {
    const { data: authorization } = await supabase.from("subsidy_authorizations").select("id").eq("project_id", p.id).maybeSingle();
    showAuthorization = !!authorization;
  }
  const isLocked = !!p.delivery_signed_at;

  return (
    <div>
      <div className={"project-header" + (coverPhotoUrl ? " has-cover" : "")}>
        {coverPhotoUrl && (
          <div className="project-header-cover">
            <img src={coverPhotoUrl} alt="" />
          </div>
        )}
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
            {current.profile.role === "eigenaar" && !isLocked && (
              <>
                <div className="header-toolbar">
                  <CoverPhotoControls projectId={p.id} hasPhoto={!!coverPhotoUrl} />
                  <EditProjectButton projectId={p.id} name={p.name} address={p.address} />
                  <StatusSelect projectId={p.id} status={p.status} />
                </div>
                <DeleteProjectButton projectId={p.id} projectName={p.name} />
              </>
            )}
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
          <RouteMenu address={p.address} />
        </div>
      )}

      <div className="tabs-row">
        <ProjectTabs
          projectId={p.id}
          visibleTabs={visibleTabs}
          showPrivateChat={showPrivateChat}
          showHours={showHours}
          showCalc={showCalc}
          showSubsidies={showSubsidies}
          showAuthorization={showAuthorization}
          hiddenTabs={p.hidden_tabs}
          canCustomize={current.profile.role === "eigenaar"}
        />
        <form action={`/projects/${p.id}/zoeken`} className="project-search">
          <Search size={14} />
          <input type="text" name="q" placeholder="Zoeken in chat, notities, documenten…" />
        </form>
      </div>
      {children}
    </div>
  );
}
