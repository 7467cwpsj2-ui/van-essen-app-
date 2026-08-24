"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Check, ChevronDown, Hammer, Search } from "lucide-react";
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
  const [showOverig, setShowOverig] = useState(false);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const activeProjects = projects.filter((p) => p.status === "lopend");
  const overigProjects = projects.filter((p) => p.status !== "lopend");
  const activeJobs = quickJobs.filter((j) => !j.done);
  const doneJobs = quickJobs.filter((j) => j.done);

  const q = query.trim().toLowerCase();
  const matches = (text: string) => text.toLowerCase().includes(q);

  const searching = q.length > 0;
  const filteredActiveProjects = searching
    ? projects.filter((p) => matches(p.name) || (p.clientName && matches(p.clientName)))
    : activeProjects;
  const filteredActiveJobs = searching ? quickJobs.filter((j) => matches(j.title)) : activeJobs;
  const filteredOverigProjects = searching ? [] : overigProjects;
  const filteredOverigJobs = searching ? [] : doneJobs;

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

  const overigCount = overigProjects.length + doneJobs.length;

  return (
    <div className="uren-picker">
      <div className="uren-search">
        <Search size={14} />
        <input
          type="text"
          placeholder="Zoek een project of klus…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="dash-panel-list">
        {filteredActiveProjects.map((p) => (
          <UrenRow
            key={p.id}
            active={selectedProjectId === p.id}
            href={`/uren?project=${p.id}`}
            icon={<ProjectThumb id={p.id} name={p.name} coverPhotoUrl={p.coverPhotoUrl} planningColor={p.planningColor} />}
            title={p.name}
            sub={`${STATUS_LABEL[p.status] ?? p.status}${p.clientName ? ` · ${p.clientName}` : ""}`}
            quickAdd={
              canQuickAdd
                ? { rowKey: `p:${p.id}`, onAdd: (h) => quickAdd({ projectId: p.id }, `p:${p.id}`, h) }
                : undefined
            }
            justAdded={justAdded}
            pending={pending}
          />
        ))}
        {filteredActiveJobs.map((j) => (
          <UrenRow
            key={j.id}
            active={selectedJobId === j.id}
            href={`/uren?job=${j.id}`}
            icon={<Hammer size={14} />}
            title={j.title}
            sub={`Losse klus · ${j.start_date === j.end_date ? j.start_date : `${j.start_date} – ${j.end_date}`}`}
            quickAdd={
              canQuickAdd
                ? { rowKey: `j:${j.id}`, onAdd: (h) => quickAdd({ quickJobId: j.id }, `j:${j.id}`, h) }
                : undefined
            }
            justAdded={justAdded}
            pending={pending}
          />
        ))}
        {searching && filteredActiveProjects.length === 0 && filteredActiveJobs.length === 0 && (
          <div className="empty-hint small">Niets gevonden voor &quot;{query}&quot;.</div>
        )}
      </div>

      {!searching && overigCount > 0 && (
        <div>
          <button type="button" className="project-group-header" onClick={() => setShowOverig((v) => !v)}>
            <ChevronDown size={13} className={"access-chevron" + (showOverig ? " open" : "")} />
            <span>Overige (afgerond / gepland)</span>
            <span className="count-badge">{overigCount}</span>
          </button>
          {showOverig && (
            <div className="dash-panel-list">
              {filteredOverigProjects.map((p) => (
                <UrenRow
                  key={p.id}
                  active={selectedProjectId === p.id}
                  href={`/uren?project=${p.id}`}
                  icon={<ProjectThumb id={p.id} name={p.name} coverPhotoUrl={p.coverPhotoUrl} planningColor={p.planningColor} />}
                  title={p.name}
                  sub={`${STATUS_LABEL[p.status] ?? p.status}${p.clientName ? ` · ${p.clientName}` : ""}`}
                  justAdded={justAdded}
                  pending={pending}
                />
              ))}
              {filteredOverigJobs.map((j) => (
                <UrenRow
                  key={j.id}
                  active={selectedJobId === j.id}
                  href={`/uren?job=${j.id}`}
                  icon={<Hammer size={14} />}
                  title={j.title}
                  sub={`Losse klus · afgerond · ${j.start_date === j.end_date ? j.start_date : `${j.start_date} – ${j.end_date}`}`}
                  justAdded={justAdded}
                  pending={pending}
                />
              ))}
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
              <Check size={12} /> Vandaag toegevoegd
            </span>
          ) : (
            <>
              <span className="uren-row-quick-label">Vandaag:</span>
              {[4, 6, 8].map((h) => (
                <button key={h} type="button" className="chip-btn" disabled={pending} onClick={() => quickAdd.onAdd(h)}>
                  {h}u
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
