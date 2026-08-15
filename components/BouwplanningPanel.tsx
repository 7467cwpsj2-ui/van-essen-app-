"use client";

import { Fragment, useState, useTransition } from "react";
import { AlertTriangle, Lock, Pencil, Plus, Trash2, Unlock, X } from "lucide-react";
import { AssigneeInput, type AssigneeTeamMember } from "@/components/AssigneeInput";
import { ScrollToToday } from "@/components/ScrollToToday";
import { createPhase, deletePhase, setPhaseFixedDate, updatePhaseDates } from "@/lib/actions/schedule";
import { endDateForWorkingDays } from "@/lib/workingDays";
import type { SchedulePhase, Task } from "@/types/database";

const DAY_MS = 86400000;
const WEEKDAY_LETTERS = ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"];

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso + "T00:00:00Z"));
}

export interface PhaseConflict {
  projectName: string;
  title: string;
}

export function BouwplanningPanel({
  projectId,
  phases,
  tasks,
  teamMembers,
  canEdit,
  conflicts = {},
}: {
  projectId: string;
  phases: SchedulePhase[];
  tasks: Task[];
  teamMembers: AssigneeTeamMember[];
  canEdit: boolean;
  conflicts?: Record<string, PhaseConflict[]>;
}) {
  const [form, setForm] = useState({ title: "", assignee: "", assigneeTeamMemberIds: [] as string[], start: "", days: "", fixedDate: false });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ start: "", days: "" });
  const [, startTransition] = useTransition();

  const teamMemberName = (id: string) => teamMembers.find((m) => m.id === id)?.name || "?";
  const phaseAssigneeLabel = (p: SchedulePhase) =>
    p.assignee_team_member_ids.length > 0 ? p.assignee_team_member_ids.map(teamMemberName).join(", ") : p.assignee;

  const computedEnd = form.start && Number(form.days) >= 1 ? endDateForWorkingDays(form.start, Number(form.days)) : "";

  const addItem = () => {
    if (!form.title.trim() || !form.start || !computedEnd) return;
    startTransition(() => {
      createPhase(projectId, {
        title: form.title,
        assignee: form.assignee,
        assigneeTeamMemberIds: form.assigneeTeamMemberIds,
        start: form.start,
        end: computedEnd,
        fixedDate: form.fixedDate,
      }).catch((err) => alert(err instanceof Error ? err.message : "Toevoegen mislukt."));
    });
    setForm({ title: "", assignee: "", assigneeTeamMemberIds: [], start: "", days: "", fixedDate: false });
  };

  const toggleFixed = (p: SchedulePhase) => {
    startTransition(() => {
      setPhaseFixedDate(projectId, p.id, !p.fixed_date).catch((err) => alert(err instanceof Error ? err.message : "Bijwerken mislukt."));
    });
  };

  const startEditPhase = (p: SchedulePhase) => {
    setEditingId(p.id);
    let count = 0;
    for (let t = new Date(p.start_date).getTime(); t <= new Date(p.end_date).getTime(); t += DAY_MS) {
      const wd = new Date(t).getUTCDay();
      if (wd !== 0 && wd !== 6) count++;
    }
    setEditForm({ start: p.start_date, days: String(count || 1) });
  };

  const editComputedEnd =
    editForm.start && Number(editForm.days) >= 1 ? endDateForWorkingDays(editForm.start, Number(editForm.days)) : "";

  const saveEditPhase = () => {
    if (!editingId || !editForm.start || !editComputedEnd) return;
    const id = editingId;
    startTransition(() => {
      updatePhaseDates(projectId, id, { start: editForm.start, end: editComputedEnd }).catch((err) =>
        alert(err instanceof Error ? err.message : "Opslaan mislukt.")
      );
    });
    setEditingId(null);
  };

  let days: Date[] = [];
  if (phases.length) {
    const min = Math.min(...phases.map((i) => new Date(i.start_date).getTime()));
    const max = Math.max(...phases.map((i) => new Date(i.end_date).getTime()));
    for (let t = min; t <= max; t += DAY_MS) days.push(new Date(t));
  }
  const todayMs = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z").getTime();
  const todayIdx = days.findIndex((d) => d.getTime() === todayMs);

  return (
    <div className="panel">
      <div className="hint-bar">
        Bouwplanning — het grote geheel per fase. De taken in &quot;Planning&quot; zijn hieraan gekoppeld en tellen automatisch mee als
        voortgang.
      </div>
      {Object.keys(conflicts).length > 0 && (
        <div className="hint-bar conflict-bar">
          <AlertTriangle size={13} style={{ display: "inline", marginRight: 6, verticalAlign: -2 }} />
          Let op: sommige fases hieronder overlappen met een planning op een ander project voor dezelfde persoon — zie het
          waarschuwingsicoontje bij de betreffende fase.
        </div>
      )}
      {phases.length === 0 ? (
        <div className="empty-hint">Nog geen bouwplanning toegevoegd.</div>
      ) : (
        <ScrollToToday todayIdx={todayIdx}>
          <div className="gantt-grid" style={{ gridTemplateColumns: `180px repeat(${days.length}, 30px)` }}>
            <div className="gantt-cell gantt-corner" />
            {days.map((d, idx) => {
              const wd = d.getUTCDay();
              return (
                <div
                  key={idx}
                  className={"gantt-cell gantt-head" + (wd === 0 || wd === 6 ? " weekend" : "") + (idx === todayIdx ? " today" : "")}
                  title={d.toISOString().slice(0, 10)}
                >
                  <span className="gantt-head-day">{d.getUTCDate()}</span>
                  <span className="gantt-head-wd">{WEEKDAY_LETTERS[wd]}</span>
                </div>
              );
            })}

            {phases.map((i) => {
              const start = new Date(i.start_date).getTime();
              const end = new Date(i.end_date).getTime();
              const linked = tasks.filter((t) => t.phase_id === i.id);
              const done = linked.filter((t) => t.done).length;
              const filledFlags = days.map((d) => {
                const t = d.getTime();
                const wd = d.getUTCDay();
                return t >= start && t <= end && wd !== 0 && wd !== 6;
              });
              return (
                <Fragment key={i.id}>
                  <div className="gantt-cell gantt-row-label">
                    <div className="gantt-row-title">
                      {i.title}
                      {i.fixed_date && (
                        <span className="gantt-fixed-icon" title="Deze fase schuift niet automatisch mee met andere wijzigingen.">
                          <Lock size={11} />
                        </span>
                      )}
                      {conflicts[i.id] && (
                        <span
                          className="gantt-conflict-icon"
                          title={
                            "Dubbele boeking voor " +
                            phaseAssigneeLabel(i) +
                            ": " +
                            conflicts[i.id].map((c) => `${c.title} (${c.projectName})`).join(", ")
                          }
                        >
                          <AlertTriangle size={12} />
                        </span>
                      )}
                    </div>
                    <div className="gantt-row-sub">
                      {phaseAssigneeLabel(i) && <span>{phaseAssigneeLabel(i)}</span>}
                      {linked.length > 0 && (
                        <span className="gantt-progress-tag">
                          {done}/{linked.length} taken
                        </span>
                      )}
                    </div>
                    {canEdit && (
                      <div className="gantt-row-actions">
                        <button
                          className="icon-btn ghost"
                          onClick={() => toggleFixed(i)}
                          title={i.fixed_date ? "Weer laten meeschuiven" : "Deze fase niet meer laten verplaatsen"}
                        >
                          {i.fixed_date ? <Unlock size={12} /> : <Lock size={12} />}
                        </button>
                        <button className="icon-btn ghost" onClick={() => startEditPhase(i)} title="Datums aanpassen">
                          <Pencil size={12} />
                        </button>
                        <button
                          className="icon-btn danger ghost"
                          onClick={() => startTransition(() => deletePhase(projectId, i.id).catch(() => {}))}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                  {days.map((d, idx) => {
                    const wd = d.getUTCDay();
                    const filled = filledFlags[idx];
                    const isFirst = filled && !filledFlags[idx - 1];
                    const isLast = filled && !filledFlags[idx + 1];
                    return (
                      <div
                        key={idx}
                        className={
                          "gantt-cell gantt-daycell" +
                          (filled ? " filled" : "") +
                          (isFirst ? " first" : "") +
                          (isLast ? " last" : "") +
                          (wd === 0 || wd === 6 ? " weekend" : "")
                        }
                        title={filled ? `${i.title}: ${i.start_date} – ${i.end_date}` : ""}
                      />
                    );
                  })}
                </Fragment>
              );
            })}

            {todayIdx >= 0 && <div className="gantt-today-line" style={{ left: `${180 + todayIdx * 30 + 15}px` }} title="Vandaag" />}
          </div>
        </ScrollToToday>
      )}
      {!canEdit && phases.length > 0 && <div className="hint-bar small">Je kunt deze bouwplanning bekijken, maar niet wijzigen.</div>}

      {canEdit && editingId && (
        <div className="add-form">
          <div className="add-form-title">
            Datums aanpassen — {phases.find((p) => p.id === editingId)?.title}
          </div>
          <div className="add-form-grid">
            <input type="date" value={editForm.start} onChange={(e) => setEditForm({ ...editForm, start: e.target.value })} title="Startdatum" />
            <input
              type="number"
              min="1"
              placeholder="Aantal werkdagen"
              value={editForm.days}
              onChange={(e) => setEditForm({ ...editForm, days: e.target.value })}
            />
            <button className="btn-primary" onClick={saveEditPhase}>
              Opslaan
            </button>
            <button className="btn-ghost" onClick={() => setEditingId(null)}>
              <X size={13} /> Annuleren
            </button>
          </div>
          <div className="hint-bar small">
            Latere fases schuiven automatisch mee op basis van deze wijziging. Een eventueel gekoppeld akkoord meerwerk/minderwerk
            blijft ongewijzigd staan.
            {editComputedEnd && (
              <>
                {" "}
                Deze fase loopt dan tot en met <b>{fmtDate(editComputedEnd)}</b>.
              </>
            )}
          </div>
        </div>
      )}

      {canEdit && (
        <div className="add-form">
          <div className="add-form-title">Planningsonderdeel toevoegen</div>
          <div className="add-form-grid">
            <input
              placeholder="Onderdeel (bv. Ruwbouw, Dakbedekking)"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <AssigneeInput
              assignee={form.assignee}
              assigneeTeamMemberIds={form.assigneeTeamMemberIds}
              onChangeAssignee={(v) => setForm({ ...form, assignee: v })}
              onChangeTeamMemberIds={(ids) => setForm({ ...form, assigneeTeamMemberIds: ids })}
              teamMembers={teamMembers}
            />
            <input
              type="date"
              value={form.start}
              onChange={(e) => setForm({ ...form, start: e.target.value })}
              title="Startdatum"
            />
            <input
              type="number"
              min="1"
              placeholder="Aantal werkdagen"
              value={form.days}
              onChange={(e) => setForm({ ...form, days: e.target.value })}
            />
            <button className="btn-primary" onClick={addItem}>
              <Plus size={14} /> Toevoegen
            </button>
          </div>
          <label className="checkbox-label">
            <input type="checkbox" checked={form.fixedDate} onChange={(e) => setForm({ ...form, fixedDate: e.target.checked })} />
            Deze fase kan niet meer verplaatst worden (schuift nooit automatisch mee met meerwerk of andere wijzigingen)
          </label>
          <div className="hint-bar small">
            Weekenden tellen niet mee bij het doortellen van de werkdagen.
            {computedEnd && (
              <>
                {" "}
                Deze fase loopt dan tot en met <b>{fmtDate(computedEnd)}</b>.
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
