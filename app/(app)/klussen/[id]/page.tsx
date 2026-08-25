import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarRange, Clock, MapPin, Users } from "lucide-react";
import { canSeeHours, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RouteMenu } from "@/components/RouteMenu";
import type { QuickJob } from "@/types/database";

const fmtDate = (iso: string) => new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso + "T00:00:00Z"));
const fmtShort = (iso: string) => new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short" }).format(new Date(iso + "T00:00:00Z"));

export default async function QuickJobPage({ params }: { params: { id: string } }) {
  const current = await requireUser();
  if (current.profile.role === "klant") notFound();

  const supabase = createClient();
  const { data } = await supabase.from("quick_jobs").select("*").eq("id", params.id).maybeSingle();
  if (!data) notFound();
  const job = data as QuickJob;

  const { data: members } = job.assignee_team_member_ids.length
    ? await supabase.from("team_members").select("id,name").in("id", job.assignee_team_member_ids)
    : { data: [] as { id: string; name: string }[] };
  const nameById = new Map((members ?? []).map((m) => [m.id as string, m.name as string]));

  const sameDay = job.start_date === job.end_date;

  return (
    <div className="panel">
      <div className="header-eyebrow">{job.kind === "kantoor" ? "Kantoordag" : "Losse klus"}</div>
      <h1 className="page-title">{job.title}</h1>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span className={"stamp " + (job.done ? "stamp-akkoord" : "stamp-open")}>{job.done ? "Gereed" : "Actief"}</span>
        <span className="access-summary-sub mono">
          <CalendarRange size={12} style={{ display: "inline", marginRight: 4, verticalAlign: -2 }} />
          {sameDay ? fmtDate(job.start_date) : `${fmtShort(job.start_date)} – ${fmtDate(job.end_date)}`}
        </span>
        {job.daypart !== "dag" && <span className="stamp stamp-open">{job.daypart === "ochtend" ? "Ochtend" : "Middag"}</span>}
      </div>

      {job.address && (
        <div className="address-card">
          <MapPin size={16} />
          <div className="address-body">
            <div className="address-label">Adres</div>
            <div className="address-value">{job.address}</div>
          </div>
          <RouteMenu address={job.address} />
        </div>
      )}

      {job.description && (
        <div>
          <div className="field-label" style={{ marginBottom: 6 }}>
            Omschrijving
          </div>
          <div className="work-explanation">{job.description}</div>
        </div>
      )}

      <div>
        <div className="field-label" style={{ marginBottom: 6 }}>
          <Users size={11} style={{ display: "inline", marginRight: 4, verticalAlign: -1 }} />
          Wie werkt hieraan
        </div>
        {job.day_assignments && job.day_assignments.length > 0 ? (
          <div className="day-assign-list">
            {job.day_assignments.map((d) => (
              <div key={d.date} className="day-assign-day">
                <div className="day-assign-date">{fmtShort(d.date)}</div>
                <div className="access-summary-sub">
                  {d.team_member_ids.length > 0 ? d.team_member_ids.map((id) => nameById.get(id) ?? "?").join(", ") : "Niemand toegewezen"}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="access-summary-sub">
            {job.assignee_team_member_ids.length > 0
              ? job.assignee_team_member_ids.map((id) => nameById.get(id) ?? "?").join(", ")
              : job.assignee || "Niet toegewezen"}
          </div>
        )}
      </div>

      {canSeeHours(current) && (
        <Link href={`/uren?job=${job.id}`} className="btn-primary" style={{ width: "fit-content" }}>
          <Clock size={14} /> Uren registreren op deze klus
        </Link>
      )}

      {current.profile.role === "eigenaar" && (
        <Link href="/planning-overzicht" className="link-btn">
          Bewerken in Algemene planning
        </Link>
      )}
    </div>
  );
}
