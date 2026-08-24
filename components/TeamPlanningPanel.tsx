"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { AlertTriangle, Check, CheckCircle2, ChevronDown, Pencil, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { ScrollToToday } from "@/components/ScrollToToday";
import { AssigneeInput, type AssigneeTeamMember } from "@/components/AssigneeInput";
import { updateProjectPlanningColor } from "@/lib/actions/projects";
import { createQuickJob, deleteQuickJob, toggleQuickJobDone, updateQuickJob } from "@/lib/actions/quickJobs";
import { colorForProject } from "@/lib/projectColor";
import { endDateForWorkingDays, isoWeekNumber, workingDaysBetween } from "@/lib/workingDays";
import type { QuickJob, QuickJobDayAssignment, TeamMemberType } from "@/types/database";

const DAY_MS = 86400000;
const WEEKDAY_LETTERS = ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"];

// Bezetting per dag instellen (bijv. dag 1 twee man, dag 2 maar één) —
// hergebruikt door zowel het toevoeg- als het bewerk-formulier hieronder.
function DayAssignmentPicker({
  days,
  value,
  onChange,
  teamMembers,
}: {
  days: string[];
  value: Record<string, string[]>;
  onChange: (next: Record<string, string[]>) => void;
  teamMembers: AssigneeTeamMember[];
}) {
  const ownStaff = teamMembers.filter((m) => m.member_type === "personeel");
  const contractors = teamMembers.filter((m) => m.member_type !== "personeel");

  const toggle = (date: string, memberId: string) => {
    const current = value[date] || [];
    const next = current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId];
    onChange({ ...value, [date]: next });
  };

  const group = (date: string, label: string, members: AssigneeTeamMember[]) =>
    members.length > 0 && (
      <div key={label}>
        <div className="field-label" style={{ margin: "6px 0 4px" }}>
          {label}
        </div>
        <div className="assignee-staff-list">
          {members.map((m) => (
            <label key={m.id} className="checkbox-label">
              <input type="checkbox" checked={(value[date] || []).includes(m.id)} onChange={() => toggle(date, m.id)} />
              {m.name}
              {m.trade ? ` — ${m.trade}` : ""}
            </label>
          ))}
        </div>
      </div>
    );

  return (
    <div className="day-assign-list">
      {days.map((date) => (
        <div key={date} className="day-assign-day">
          <div className="day-assign-date">{fmtShort(date)}</div>
          {teamMembers.length === 0 ? (
            <div className="empty-hint small">Nog geen teamleden toegevoegd.</div>
          ) : (
            <>
              {group(date, "Eigen personeel", ownStaff)}
              {group(date, "Onderaannemers", contractors)}
            </>
          )}
        </div>
      ))}
    </div>
  );
}

export interface PlanningRow {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  projectColor: string | null;
  isQuickJob: boolean;
  fixedDate: boolean;
  assignee: string | null;
  memberType: TeamMemberType | null;
  start_date: string;
  end_date: string;
}

interface DayCell {
  blockKey: string | null;
  background: string | null;
  label: string;
}

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return aStart <= bEnd && bStart <= aEnd;
}

function fmtShort(iso: string) {
  return new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short" }).format(new Date(iso + "T00:00:00Z"));
}

export function TeamPlanningPanel({
  rows,
  quickJobs,
  teamMembers,
}: {
  rows: PlanningRow[];
  quickJobs: QuickJob[];
  teamMembers: AssigneeTeamMember[];
}) {
  const todayMs = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z").getTime();
  const [, startTransition] = useTransition();
  const [form, setForm] = useState({
    title: "",
    assignee: "",
    assigneeTeamMemberIds: [] as string[],
    start: "",
    days: "",
    address: "",
    description: "",
  });
  const [filter, setFilter] = useState<"alle" | "personeel" | "onderaannemer">("alle");
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [editJobForm, setEditJobForm] = useState({
    title: "",
    assignee: "",
    assigneeTeamMemberIds: [] as string[],
    start: "",
    days: "",
    address: "",
    description: "",
  });
  const [showDoneJobs, setShowDoneJobs] = useState(false);
  const [showAddJob, setShowAddJob] = useState(false);
  const [perDay, setPerDay] = useState(false);
  const [dayAssignments, setDayAssignments] = useState<Record<string, string[]>>({});
  const [editPerDay, setEditPerDay] = useState(false);
  const [editDayAssignments, setEditDayAssignments] = useState<Record<string, string[]>>({});

  const teamMemberName = (id: string) => teamMembers.find((m) => m.id === id)?.name || "?";
  const quickJobAssigneeLabel = (j: QuickJob) => {
    if (j.day_assignments && j.day_assignments.length > 0) {
      return j.day_assignments.map((d) => `${d.team_member_ids.map(teamMemberName).join(" + ") || "niemand"} (${fmtShort(d.date)})`).join(", ");
    }
    return j.assignee_team_member_ids.length > 0 ? j.assignee_team_member_ids.map(teamMemberName).join(", ") : j.assignee || "Niet toegewezen";
  };

  const computedEnd = form.start && Number(form.days) >= 1 ? endDateForWorkingDays(form.start, Number(form.days)) : "";
  const workDays = form.start && computedEnd ? workingDaysBetween(form.start, computedEnd) : [];

  const buildDayAssignments = (days: string[], map: Record<string, string[]>): QuickJobDayAssignment[] | null => {
    const list = days.map((date) => ({ date, team_member_ids: map[date] || [] })).filter((d) => d.team_member_ids.length > 0);
    return list.length > 0 ? list : null;
  };

  const closeAddJob = () => {
    setShowAddJob(false);
    setForm({ title: "", assignee: "", assigneeTeamMemberIds: [], start: "", days: "", address: "", description: "" });
    setPerDay(false);
    setDayAssignments({});
  };

  const addQuickJob = () => {
    if (!form.title.trim() || !form.start || !computedEnd) return;
    startTransition(() => {
      createQuickJob({
        title: form.title,
        assignee: form.assignee,
        assigneeTeamMemberIds: form.assigneeTeamMemberIds,
        start: form.start,
        end: computedEnd,
        address: form.address,
        description: form.description,
        dayAssignments: perDay ? buildDayAssignments(workDays, dayAssignments) : null,
      }).catch((err) => alert(err instanceof Error ? err.message : "Toevoegen mislukt."));
    });
    closeAddJob();
  };

  const startEditJob = (j: QuickJob) => {
    setEditingJobId(j.id);
    let count = 0;
    for (let t = new Date(j.start_date).getTime(); t <= new Date(j.end_date).getTime(); t += DAY_MS) {
      const wd = new Date(t).getUTCDay();
      if (wd !== 0 && wd !== 6) count++;
    }
    setEditJobForm({
      title: j.title,
      assignee: j.assignee ?? "",
      assigneeTeamMemberIds: j.assignee_team_member_ids,
      start: j.start_date,
      days: String(count || 1),
      address: j.address ?? "",
      description: j.description ?? "",
    });
    if (j.day_assignments && j.day_assignments.length > 0) {
      setEditPerDay(true);
      const map: Record<string, string[]> = {};
      for (const d of j.day_assignments) map[d.date] = d.team_member_ids;
      setEditDayAssignments(map);
    } else {
      setEditPerDay(false);
      setEditDayAssignments({});
    }
  };

  const cancelEditJob = () => setEditingJobId(null);

  const editJobComputedEnd =
    editJobForm.start && Number(editJobForm.days) >= 1 ? endDateForWorkingDays(editJobForm.start, Number(editJobForm.days)) : "";
  const editWorkDays = editJobForm.start && editJobComputedEnd ? workingDaysBetween(editJobForm.start, editJobComputedEnd) : [];

  const saveEditJob = (id: string) => {
    if (!editJobForm.title.trim() || !editJobForm.start || !editJobComputedEnd) return;
    startTransition(() => {
      updateQuickJob(id, {
        title: editJobForm.title,
        assignee: editJobForm.assignee,
        assigneeTeamMemberIds: editJobForm.assigneeTeamMemberIds,
        start: editJobForm.start,
        end: editJobComputedEnd,
        address: editJobForm.address,
        description: editJobForm.description,
        dayAssignments: editPerDay ? buildDayAssignments(editWorkDays, editDayAssignments) : null,
      }).catch((err) => alert(err instanceof Error ? err.message : "Opslaan mislukt."));
    });
    setEditingJobId(null);
  };

  const initialColors = useMemo(() => {
    const map: Record<string, string> = {};
    for (const r of rows) {
      if (!map[r.projectId]) map[r.projectId] = r.projectColor || colorForProject(r.projectId);
    }
    return map;
  }, [rows]);
  const [colors, setColors] = useState<Record<string, string>>(initialColors);
  const colorOf = (projectId: string) => colors[projectId] ?? initialColors[projectId] ?? colorForProject(projectId);

  const handleColorChange = (projectId: string, value: string) => {
    setColors((prev) => ({ ...prev, [projectId]: value }));
    startTransition(() => {
      updateProjectPlanningColor(projectId, value).catch((err) => alert(err instanceof Error ? err.message : "Opslaan mislukt."));
    });
  };

  const assigned = rows.filter((r) => r.assignee && (filter === "alle" || r.memberType === filter));
  const people = Array.from(new Set(assigned.map((r) => r.assignee as string))).sort((a, b) => a.localeCompare(b, "nl"));

  const jobMemberType = (j: QuickJob): TeamMemberType | null => {
    if (j.assignee_team_member_ids.length > 0) {
      const m = teamMembers.find((tm) => tm.id === j.assignee_team_member_ids[0]);
      return m?.member_type ?? "personeel";
    }
    if (j.assignee?.trim()) {
      const match = teamMembers.find((tm) => tm.name.trim().toLowerCase() === j.assignee!.trim().toLowerCase());
      return match?.member_type ?? "onderaannemer";
    }
    return null;
  };
  const filteredQuickJobs = quickJobs.filter((j) => !j.done && (filter === "alle" || jobMemberType(j) === filter));
  const doneQuickJobs = quickJobs.filter((j) => j.done && (filter === "alle" || jobMemberType(j) === filter));

  const days: Date[] = [];
  if (assigned.length) {
    const min = Math.min(...assigned.map((r) => new Date(r.start_date).getTime()));
    const max = Math.max(...assigned.map((r) => new Date(r.end_date).getTime()));
    for (let t = min; t <= max; t += DAY_MS) days.push(new Date(t));
  }
  const todayIdx = days.findIndex((d) => d.getTime() === todayMs);

  const legend = Array.from(new Map(assigned.map((r) => [r.projectId, { name: r.projectName, isQuickJob: r.isQuickJob }])).entries()).sort(
    (a, b) => a[1].name.localeCompare(b[1].name, "nl")
  );

  return (
    <div className="panel panel-wide">
      <div className="header-eyebrow">Overzicht</div>
      <h1 className="page-title">Algemene planning</h1>
      <div className="hint-bar">
        Personeelsplanning over al je projecten heen — elke rij is één persoon, elke kleur een project of losse klus. Klik op een
        kleurbolletje hieronder om de kleur van een project zelf aan te passen.
      </div>
      <div className="mode-toggle">
        <button type="button" className={filter === "alle" ? "active" : ""} onClick={() => setFilter("alle")}>
          Alles
        </button>
        <button type="button" className={filter === "personeel" ? "active" : ""} onClick={() => setFilter("personeel")}>
          Eigen personeel
        </button>
        <button type="button" className={filter === "onderaannemer" ? "active" : ""} onClick={() => setFilter("onderaannemer")}>
          Onderaannemers
        </button>
      </div>
      {legend.length > 0 && (
        <div className="planning-legend">
          {legend.map(([id, info]) => (
            <div key={id} className="planning-legend-item">
              {info.isQuickJob ? (
                <span className="planning-legend-swatch planning-legend-swatch-static" style={{ background: colorOf(id) }} />
              ) : (
                <input
                  type="color"
                  value={colorOf(id)}
                  onChange={(e) => handleColorChange(id, e.target.value)}
                  className="planning-legend-swatch"
                  title={`Kleur voor ${info.name} aanpassen`}
                />
              )}
              {info.isQuickJob ? (
                <span className="planning-legend-label">{info.name}</span>
              ) : (
                <Link href={`/projects/${id}/bouwplanning`} className="planning-legend-label">
                  {info.name}
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
      {people.length === 0 ? (
        <div className="empty-hint">
          {filter === "alle"
            ? "Nog geen bouwplanning met een toegewezen persoon gevonden."
            : filter === "personeel"
              ? "Geen ingepland eigen personeel gevonden."
              : "Geen ingeplande onderaannemers gevonden."}
        </div>
      ) : (
        <ScrollToToday todayIdx={todayIdx}>
          <div
            className="gantt-grid"
            style={{ gridTemplateColumns: `160px repeat(${days.length}, 30px)`, gridTemplateRows: "20px 48px" }}
          >
            <div className="gantt-cell gantt-corner" />
            {days.map((d, idx) => {
              const wd = d.getUTCDay();
              const isWeekStart = wd === 1 || idx === 0;
              return (
                <div key={idx} className={"gantt-cell gantt-week-cell" + (isWeekStart && idx > 0 ? " week-start" : "")}>
                  {isWeekStart && <span className="gantt-week-label">Wk {isoWeekNumber(d)}</span>}
                </div>
              );
            })}
            <div className="gantt-cell gantt-corner" />
            {days.map((d, idx) => {
              const wd = d.getUTCDay();
              return (
                <div
                  key={idx}
                  className={
                    "gantt-cell gantt-head" +
                    (wd === 0 || wd === 6 ? " weekend" : "") +
                    (idx === todayIdx ? " today" : "") +
                    (d.getUTCDate() === 1 ? " month-start" : "")
                  }
                  title={d.toISOString().slice(0, 10)}
                >
                  <span className="gantt-head-day">{d.getUTCDate()}</span>
                  <span className="gantt-head-wd">{WEEKDAY_LETTERS[wd]}</span>
                </div>
              );
            })}

            {people.map((person) => {
              const personRows = assigned.filter((r) => r.assignee === person);
              const cells: DayCell[] = days.map((d) => {
                const wd = d.getUTCDay();
                if (wd === 0 || wd === 6) return { blockKey: null, background: null, label: "" };
                const iso = d.toISOString().slice(0, 10);
                const matches = personRows.filter((r) => r.start_date <= iso && iso <= r.end_date);
                if (matches.length === 0) return { blockKey: null, background: null, label: "" };
                if (matches.length === 1) {
                  const color = colorOf(matches[0].projectId);
                  const label = `${matches[0].projectName} — ${matches[0].title}${matches[0].fixedDate ? " (vaste datum)" : ""}`;
                  return { blockKey: matches[0].projectId, background: color, label };
                }
                const usedColors = Array.from(new Set(matches.map((m) => colorOf(m.projectId))));
                const stripe =
                  usedColors.length === 1
                    ? usedColors[0]
                    : `repeating-linear-gradient(45deg, ${usedColors[0]}, ${usedColors[0]} 6px, ${usedColors[1]} 6px, ${usedColors[1]} 12px)`;
                return {
                  blockKey: "conflict:" + usedColors.join(","),
                  background: stripe,
                  label: "Dubbel ingepland: " + matches.map((m) => `${m.projectName} — ${m.title}`).join(" / "),
                };
              });
              const hasConflict = cells.some((c) => c.blockKey?.startsWith("conflict:"));

              return (
                <Fragment key={person}>
                  <div className="gantt-cell gantt-row-label">
                    <div className="gantt-row-title">
                      {person}
                      {hasConflict && (
                        <span className="gantt-conflict-icon" title="Deze persoon staat op hetzelfde moment op meerdere projecten ingepland.">
                          <AlertTriangle size={12} />
                        </span>
                      )}
                    </div>
                  </div>
                  {cells.map((cell, idx) => {
                    const isFirst = cell.blockKey !== null && cells[idx - 1]?.blockKey !== cell.blockKey;
                    const isLast = cell.blockKey !== null && cells[idx + 1]?.blockKey !== cell.blockKey;
                    const wd = days[idx].getUTCDay();
                    return (
                      <div
                        key={idx}
                        className={
                          "gantt-cell gantt-daycell" +
                          (cell.blockKey !== null ? " filled" : "") +
                          (isFirst ? " first" : "") +
                          (isLast ? " last" : "") +
                          (wd === 0 || wd === 6 ? " weekend" : "")
                        }
                        style={cell.background ? { background: cell.background } : undefined}
                        title={cell.label}
                      />
                    );
                  })}
                </Fragment>
              );
            })}

            {todayIdx >= 0 && <div className="gantt-today-line" style={{ left: `${160 + todayIdx * 30 + 15}px` }} title="Vandaag" />}
          </div>
        </ScrollToToday>
      )}

      <button type="button" className="btn-primary" onClick={() => setShowAddJob(true)} style={{ alignSelf: "flex-start" }}>
        <Plus size={14} /> Kleine klus toevoegen
      </button>

      {showAddJob && (
        <div className="sig-overlay" onClick={closeAddJob}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "85vh", overflowY: "auto" }}>
            <div className="modal-title">Kleine klus toevoegen</div>
            <div className="hint-bar small">1-3 dagen, geen project of klant nodig.</div>
            <div className="add-form-grid">
              <input
                placeholder="Wat moet er gebeuren?"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              <input placeholder="Adres (optioneel)" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              <input type="date" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} title="Startdatum" />
              <input
                type="number"
                min="1"
                max="3"
                placeholder="Aantal dagen"
                value={form.days}
                onChange={(e) => setForm({ ...form, days: e.target.value })}
              />
            </div>
            <label className="field-with-label">
              <span className="field-label">Omschrijving van de werkzaamheden (optioneel)</span>
              <textarea
                rows={3}
                placeholder="Wat moet er precies gebeuren?"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>
            {workDays.length > 1 && (
              <label className="checkbox-label">
                <input type="checkbox" checked={perDay} onChange={(e) => setPerDay(e.target.checked)} />
                Per dag andere mensen inplannen (bijv. dag 1 twee man, dag 2 maar één)
              </label>
            )}
            {perDay && workDays.length > 1 ? (
              <DayAssignmentPicker days={workDays} value={dayAssignments} onChange={setDayAssignments} teamMembers={teamMembers} />
            ) : (
              <AssigneeInput
                assignee={form.assignee}
                assigneeTeamMemberIds={form.assigneeTeamMemberIds}
                onChangeAssignee={(v) => setForm({ ...form, assignee: v })}
                onChangeTeamMemberIds={(ids) => setForm({ ...form, assigneeTeamMemberIds: ids })}
                teamMembers={teamMembers}
              />
            )}
            {computedEnd && (
              <div className="hint-bar small">
                Deze klus loopt van {fmtShort(form.start)} t/m {fmtShort(computedEnd)} (weekenden tellen niet mee).
              </div>
            )}
            <div className="modal-actions">
              <button type="button" className="btn-ghost" onClick={closeAddJob}>
                Annuleren
              </button>
              <button type="button" className="btn-primary" onClick={addQuickJob}>
                <Plus size={14} /> Toevoegen
              </button>
            </div>
          </div>
        </div>
      )}

      {filteredQuickJobs.length > 0 && (
        <>
          <div className="add-form-title" style={{ marginTop: 4 }}>
            Losse klussen
          </div>
          <div className="task-list">
            {filteredQuickJobs.map((j) =>
              editingJobId === j.id ? (
                <div key={j.id} className="add-form">
                  <div className="add-form-grid">
                    <input
                      placeholder="Wat moet er gebeuren?"
                      value={editJobForm.title}
                      onChange={(e) => setEditJobForm({ ...editJobForm, title: e.target.value })}
                    />
                    <input
                      placeholder="Adres (optioneel)"
                      value={editJobForm.address}
                      onChange={(e) => setEditJobForm({ ...editJobForm, address: e.target.value })}
                    />
                    <input
                      type="date"
                      value={editJobForm.start}
                      onChange={(e) => setEditJobForm({ ...editJobForm, start: e.target.value })}
                      title="Startdatum"
                    />
                    <input
                      type="number"
                      min="1"
                      max="3"
                      placeholder="Aantal dagen"
                      value={editJobForm.days}
                      onChange={(e) => setEditJobForm({ ...editJobForm, days: e.target.value })}
                    />
                  </div>
                  <label className="field-with-label">
                    <span className="field-label">Omschrijving van de werkzaamheden (optioneel)</span>
                    <textarea
                      rows={3}
                      placeholder="Wat moet er precies gebeuren?"
                      value={editJobForm.description}
                      onChange={(e) => setEditJobForm({ ...editJobForm, description: e.target.value })}
                    />
                  </label>
                  {editWorkDays.length > 1 && (
                    <label className="checkbox-label">
                      <input type="checkbox" checked={editPerDay} onChange={(e) => setEditPerDay(e.target.checked)} />
                      Per dag andere mensen inplannen (bijv. dag 1 twee man, dag 2 maar één)
                    </label>
                  )}
                  {editPerDay && editWorkDays.length > 1 ? (
                    <DayAssignmentPicker
                      days={editWorkDays}
                      value={editDayAssignments}
                      onChange={setEditDayAssignments}
                      teamMembers={teamMembers}
                    />
                  ) : (
                    <AssigneeInput
                      assignee={editJobForm.assignee}
                      assigneeTeamMemberIds={editJobForm.assigneeTeamMemberIds}
                      onChangeAssignee={(v) => setEditJobForm({ ...editJobForm, assignee: v })}
                      onChangeTeamMemberIds={(ids) => setEditJobForm({ ...editJobForm, assigneeTeamMemberIds: ids })}
                      teamMembers={teamMembers}
                    />
                  )}
                  {editJobComputedEnd && (
                    <div className="hint-bar small">
                      Deze klus loopt dan van {fmtShort(editJobForm.start)} t/m {fmtShort(editJobComputedEnd)}.
                    </div>
                  )}
                  <div className="dossier-status-actions">
                    <button className="btn-primary" onClick={() => saveEditJob(j.id)}>
                      <Check size={14} /> Opslaan
                    </button>
                    <button className="btn-ghost" onClick={cancelEditJob}>
                      <X size={14} /> Annuleren
                    </button>
                  </div>
                </div>
              ) : (
                <div key={j.id} className="task-row">
                  <div className="task-body">
                    <Link href={`/klussen/${j.id}`} className="task-title">
                      {j.title}
                    </Link>
                    <div className="task-meta">
                      <span>{quickJobAssigneeLabel(j)}</span>
                      <span className="mono">
                        {fmtShort(j.start_date)} – {fmtShort(j.end_date)}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn-success"
                      onClick={() => startTransition(() => toggleQuickJobDone(j.id, true).catch(() => {}))}
                    >
                      <CheckCircle2 size={15} /> Gereed
                    </button>
                    <button className="icon-btn ghost" onClick={() => startEditJob(j)} title="Bewerken">
                      <Pencil size={14} />
                    </button>
                    <button
                      className="icon-btn danger ghost"
                      title="Verwijderen"
                      onClick={() => startTransition(() => deleteQuickJob(j.id).catch(() => {}))}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        </>
      )}

      {doneQuickJobs.length > 0 && (
        <div>
          <button type="button" className="project-group-header" onClick={() => setShowDoneJobs((v) => !v)}>
            <ChevronDown size={13} className={"access-chevron" + (showDoneJobs ? " open" : "")} />
            <span>Afgeronde losse klussen</span>
            <span className="count-badge">{doneQuickJobs.length}</span>
          </button>
          {showDoneJobs && (
            <div className="task-list">
              {doneQuickJobs.map((j) => (
                <div key={j.id} className="task-row done">
                  <div className="task-body">
                    <Link href={`/klussen/${j.id}`} className="task-title">
                      {j.title}
                    </Link>
                    <div className="task-meta">
                      <span>{quickJobAssigneeLabel(j)}</span>
                      <span className="mono">
                        {fmtShort(j.start_date)} – {fmtShort(j.end_date)}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      className="icon-btn ghost"
                      title="Heropenen"
                      onClick={() => startTransition(() => toggleQuickJobDone(j.id, false).catch(() => {}))}
                    >
                      <RotateCcw size={14} />
                    </button>
                    <button
                      className="icon-btn danger ghost"
                      title="Verwijderen"
                      onClick={() => startTransition(() => deleteQuickJob(j.id).catch(() => {}))}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
