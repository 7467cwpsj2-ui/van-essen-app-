"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Circle, Plus, Trash2, Users } from "lucide-react";
import { AssigneeInput } from "@/components/AssigneeInput";
import { createTask, deleteTask, toggleTask } from "@/lib/actions/tasks";
import type { Role, SchedulePhase, Task } from "@/types/database";

function fmtDate(iso: string | null) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short" }).format(new Date(iso));
}

export function PlanningPanel({
  projectId,
  role,
  phases,
  tasks,
  teamMembers,
}: {
  projectId: string;
  role: Role;
  phases: SchedulePhase[];
  tasks: Task[];
  teamMembers: { id: string; name: string; trade: string | null }[];
}) {
  const [form, setForm] = useState({ title: "", assignee: "", dueDate: "", phaseId: "" });
  const [, startTransition] = useTransition();

  const findPhaseForDate = (dateStr: string) => {
    if (!dateStr) return "";
    const t = new Date(dateStr).getTime();
    const hit = phases.find((ph) => t >= new Date(ph.start_date).getTime() && t <= new Date(ph.end_date).getTime());
    return hit ? hit.id : "";
  };

  const onPickPhase = (phaseId: string) => {
    const ph = phases.find((p) => p.id === phaseId);
    setForm((f) => ({
      ...f,
      phaseId,
      dueDate: ph ? f.dueDate || ph.start_date : f.dueDate,
      assignee: ph && !f.assignee ? ph.assignee || "" : f.assignee,
    }));
  };

  const onPickDate = (dueDate: string) => {
    setForm((f) => ({ ...f, dueDate, phaseId: f.phaseId || findPhaseForDate(dueDate) }));
  };

  const addTask = () => {
    if (!form.title.trim()) return;
    startTransition(() => {
      createTask(projectId, {
        title: form.title,
        assignee: form.assignee || null,
        dueDate: form.dueDate || null,
        phaseId: form.phaseId || null,
      }).catch((err) => alert(err instanceof Error ? err.message : "Toevoegen mislukt."));
    });
    setForm({ title: "", assignee: "", dueDate: "", phaseId: "" });
  };

  const groups = [
    ...phases.map((ph) => ({
      id: ph.id,
      title: ph.title,
      range: `${fmtDate(ph.start_date)} – ${fmtDate(ph.end_date)}`,
    })),
    { id: "", title: "Overig / niet gekoppeld aan een fase", range: "" },
  ];

  return (
    <div className="panel">
      {phases.length > 0 && (
        <div className="hint-bar">
          Dagplanning is gekoppeld aan de bouwplanning: elke taak hoort bij een fase, zodat je hier het dagelijkse werk ziet en bij
          Bouwplanning het grote geheel.
        </div>
      )}
      {tasks.length === 0 && <div className="empty-hint">Nog geen taken.</div>}
      {groups.map((g) => {
        const groupTasks = tasks
          .filter((t) => (t.phase_id || "") === g.id)
          .sort((a, b) => (a.done === b.done ? 0 : a.done ? 1 : -1));
        if (groupTasks.length === 0) return null;
        return (
          <div key={g.id || "overig"} className="phase-group">
            <div className="phase-group-title">
              {g.title}
              {g.range && <span className="mono phase-group-range"> · {g.range}</span>}
            </div>
            <div className="task-list">
              {groupTasks.map((t) => (
                <div key={t.id} className={"task-row" + (t.done ? " done" : "")}>
                  <button
                    className="task-check"
                    onClick={() => role !== "klant" && startTransition(() => toggleTask(projectId, t.id, !t.done).catch(() => {}))}
                    disabled={role === "klant"}
                  >
                    {t.done ? <CheckCircle2 size={19} /> : <Circle size={19} />}
                  </button>
                  <div className="task-body">
                    <div className="task-title">{t.title}</div>
                    {role !== "klant" && (
                      <div className="task-meta">
                        {t.assignee && (
                          <span>
                            <Users size={11} /> {t.assignee}
                          </span>
                        )}
                        {t.due_date && <span className="mono">{t.due_date}</span>}
                      </div>
                    )}
                  </div>
                  {role === "eigenaar" && (
                    <button
                      className="icon-btn danger ghost"
                      onClick={() => startTransition(() => deleteTask(projectId, t.id).catch(() => {}))}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {role !== "klant" && (
        <div className="add-form">
          <div className="add-form-title">Nieuwe taak</div>
          <div className="add-form-grid">
            <input
              placeholder="Wat moet er gebeuren?"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            {phases.length > 0 && (
              <select value={form.phaseId} onChange={(e) => onPickPhase(e.target.value)}>
                <option value="">Geen fase (overig)</option>
                {phases.map((ph) => (
                  <option key={ph.id} value={ph.id}>
                    {ph.title}
                  </option>
                ))}
              </select>
            )}
            <AssigneeInput value={form.assignee} onChange={(v) => setForm({ ...form, assignee: v })} teamMembers={teamMembers} />
            <input type="date" value={form.dueDate} onChange={(e) => onPickDate(e.target.value)} />
            <button className="btn-primary" onClick={addTask}>
              <Plus size={14} /> Toevoegen
            </button>
          </div>
          {phases.length > 0 && (
            <div className="hint-bar small">
              Kies je eerst een fase of een datum, dan wordt de rest automatisch gekoppeld — je kunt het altijd aanpassen.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
