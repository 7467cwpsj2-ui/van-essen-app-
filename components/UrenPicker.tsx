"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, ChevronDown, Hammer, Search, X } from "lucide-react";
import { createHourEntry } from "@/lib/actions/hours";
import { ProjectThumb } from "@/components/ProjectThumb";

const STATUS_LABEL: Record<string, string> = {
  gepland: "Gepland",
  lopend: "Lopend",
  afgerond: "Afgerond",
};

interface PickerProject {
  id: string;
  name: string;
  status: string;
  clientName: string | null;
  coverPhotoUrl: string | null;
  planningColor: string | null;
}

interface PickerJob {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  done: boolean;
}

export function UrenPicker({
  projects,
  quickJobs,
  selectedProjectId,
  selectedJobId,
  canQuickAdd,
  currentTeamMemberId,
  todayIso,
}: {
  projects: PickerProject[];
  quickJobs: PickerJob[];
  selectedProjectId: string | null;
  selectedJobId: string | null;
  canQuickAdd: boolean;
  currentTeamMemberId: string | null;
  todayIso: string;
}) {
  const [query, setQuery] = useState("");
  const [showOther, setShowOther] = useState(false);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Alleen een klus die vandaag daadwerkelijk loopt (en een lopend
  // project, dat heeft geen dag-precisie) is relevant voor "snel uren
  // van vandaag toevoegen" — alle andere (toekomstige, afgeronde,
  // geplande) klussen/projecten zouden hier alleen maar drie knopjes
  // per regel aan afleiding toevoegen zonder ooit bruikbaar te zijn.
  const isJobToday = (j: PickerJob) => !j.done && j.start_date <= todayIso && j.end_date >= todayIso;

  const todayProjects = projects.filter((p) => p.status === "lopend");
  const todayJobs = quickJobs.filter(isJobToday);
  const otherProjects = projects.filter((p) => p.status !== "lopend");
  const otherJobs = quickJobs.filter((j) => !isJobToday(j));
  const otherCount = otherProjects.length + otherJobs.length;

  const q = query.trim().toLowerCase();
  const matches = (text: string) => text.toLowerCase().includes(q);
  const searching = q.length > 0;

  const quickAdd = (target: { projectId: string } | { quickJobId: string }, rowKey: string, hours: number) => {
    if (!currentTeamMemberId) return;
    startTransition(() => {
      createHourEntry(target, { teamMemberId: currentTeamMemberId, workDate: todayIso, hours, note: null })
        .then(() => {
          setJustAdded(rowKey);
          setTimeout(() => setJustAdded((v) => (v === rowKey ? null : v)), 2500);
        })
        .catch((err) => alert(err instanceof Error ? err.message : "Toevoegen mislukt."));
    });
  };

  const projectRow = (p: PickerProject, withQuickAdd: boolean) => (
    <UrenRow
      key={p.id}
      active={selectedProjectId === p.id}
      href={`/uren?project=${p.id}`}
      icon={<ProjectThumb id={p.id} name={p.name} coverPhotoUrl={p.coverPhotoUrl} planningColor={p.planningColor} />}
      title={p.name}
      sub={`${STATUS_LABEL[p.status] ?? p.status}${p.clientName ? ` · ${p.clientName}` : ""}`}
      quickAdd={canQuickAdd && withQuickAdd ? { rowKey: `p:${p.id}`, onAdd: (h) => quickAdd({ projectId: p.id }, `p:${p.id}`, h) } : undefined}
      justAdded={justAdded}
      pending={pending}
    />
  );

  const jobRow = (j: PickerJob, withQuickAdd: boolean) => (
    <UrenRow
      key={j.id}
      active={selectedJobId === j.id}
      href={`/uren?job=${j.id}`}
      icon={<Hammer size={14} />}
      title={j.title}
      sub={`Losse klus · ${j.start_date === j.end_date ? j.start_date : `${j.start_date} – ${j.end_date}`}`}
      quickAdd={canQuickAdd && withQuickAdd ? { rowKey: `j:${j.id}`, onAdd: (h) => quickAdd({ quickJobId: j.id }, `j:${j.id}`, h) } : undefined}
      justAdded={justAdded}
      pending={pending}
    />
  );

  if (searching) {
    const foundProjects = [...todayProjects, ...otherProjects].filter((p) => matches(p.name) || (p.clientName && matches(p.clientName)));
    const foundJobs = [...todayJobs, ...otherJobs].filter((j) => matches(j.title));
    return (
      <div className="uren-picker">
        <div className="uren-search">
          <Search size={14} />
          <input type="text" placeholder="Zoek een project of klus…" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
        </div>
        <div className="dash-panel-list">
          {foundProjects.map((p) => projectRow(p, p.status === "lopend"))}
          {foundJobs.map((j) => jobRow(j, isJobToday(j)))}
          {foundProjects.length === 0 && foundJobs.length === 0 && (
            <div className="empty-hint small">Niets gevonden voor &quot;{query}&quot;.</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="uren-picker">
      <div className="uren-search">
        <Search size={14} />
        <input type="text" placeholder="Zoek een project of klus…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <div className="dash-section-title" style={{ marginTop: 0 }}>
        Vandaag
      </div>
      {(todayProjects.length > 0 || todayJobs.length > 0) && canQuickAdd && (
        <div className="hint-bar small">
          Niet 4, 6 of 8 uur? Kies &quot;Anders…&quot; voor een ander aantal. Verkeerd getikt? Tik op de naam voor het volledige
          overzicht — daar kun je elke registratie nog aanpassen of verwijderen.
        </div>
      )}
      {todayProjects.length === 0 && todayJobs.length === 0 ? (
        <div className="empty-hint small">Niets van jou gepland voor vandaag — zoek hierboven of kies iets uit &quot;overige&quot;.</div>
      ) : (
        <div className="dash-panel-list">
          {todayProjects.map((p) => projectRow(p, true))}
          {todayJobs.map((j) => jobRow(j, true))}
        </div>
      )}

      {otherCount > 0 && (
        <div>
          <button type="button" className="project-group-header" onClick={() => setShowOther((v) => !v)}>
            <ChevronDown size={13} className={"access-chevron" + (showOther ? " open" : "")} />
            <span>Overige projecten en klussen</span>
            <span className="count-badge">{otherCount}</span>
          </button>
          {showOther && (
            <div className="dash-panel-list">
              {otherProjects.map((p) => projectRow(p, false))}
              {otherJobs.map((j) => jobRow(j, false))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function UrenRow({
  active,
  href,
  icon,
  title,
  sub,
  quickAdd,
  justAdded,
  pending,
}: {
  active: boolean;
  href: string;
  icon: React.ReactNode;
  title: string;
  sub: string;
  quickAdd?: { rowKey: string; onAdd: (hours: number) => void };
  justAdded: string | null;
  pending: boolean;
}) {
  const [customOpen, setCustomOpen] = useState(false);
  const [customValue, setCustomValue] = useState("");

  const submitCustom = () => {
    const h = Number(customValue);
    if (!(h > 0) || !quickAdd) return;
    quickAdd.onAdd(h);
    setCustomOpen(false);
    setCustomValue("");
  };

  return (
    <div className={"uren-row" + (active ? " active" : "")}>
      <Link href={href} className="uren-row-main">
        <div className="dash-panel-row-icon">{icon}</div>
        <div className="dash-panel-row-body">
          <div className="dash-panel-row-title">{title}</div>
          <div className="dash-panel-row-sub">{sub}</div>
        </div>
      </Link>
      {quickAdd && (
        <div className="uren-row-quick">
          {justAdded === quickAdd.rowKey ? (
            <span className="uren-row-quick-ok">
              <Check size={12} /> Toegevoegd
            </span>
          ) : customOpen ? (
            <>
              <input
                type="number"
                min="0"
                step="0.5"
                autoFocus
                placeholder="Uren"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitCustom()}
                className="uren-row-quick-input"
              />
              <button type="button" className="chip-btn" disabled={pending || !customValue} onClick={submitCustom}>
                <Check size={12} /> OK
              </button>
              <button type="button" className="chip-btn ghost" title="Annuleren" onClick={() => setCustomOpen(false)}>
                <X size={12} />
              </button>
            </>
          ) : (
            <>
              {[4, 6, 8].map((h) => (
                <button key={h} type="button" className="chip-btn" disabled={pending} onClick={() => quickAdd.onAdd(h)}>
                  {h}u
                </button>
              ))}
              <button type="button" className="chip-btn ghost" disabled={pending} onClick={() => setCustomOpen(true)}>
                Anders…
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
