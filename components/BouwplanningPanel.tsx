"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { AssigneeInput } from "@/components/AssigneeInput";
import { createPhase, deletePhase } from "@/lib/actions/schedule";
import type { SchedulePhase, Task } from "@/types/database";

const DAY_MS = 86400000;
const WEEKDAY_LETTERS = ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"];

export function BouwplanningPanel({
  projectId,
  phases,
  tasks,
  teamMembers,
  canEdit,
}: {
  projectId: string;
  phases: SchedulePhase[];
  tasks: Task[];
  teamMembers: { id: string; name: string; trade: string | null }[];
  canEdit: boolean;
}) {
  const [form, setForm] = useState({ title: "", assignee: "", start: "", end: "" });
  const [, startTransition] = useTransition();

  const addItem = () => {
    if (!form.title.trim() || !form.start || !form.end) return;
    startTransition(() => {
      createPhase(projectId, form).catch((err) => alert(err instanceof Error ? err.message : "Toevoegen mislukt."));
    });
    setForm({ title: "", assignee: "", start: "", end: "" });
  };

  let days: Date[] = [];
  if (phases.length) {
    const min = Math.min(...phases.map((i) => new Date(i.start_date).getTime()));
    const max = Math.max(...phases.map((i) => new Date(i.end_date).getTime()));
    for (let t = min; t <= max; t += DAY_MS) days.push(new Date(t));
  }

  return (
    <div className="panel">
      <div className="hint-bar">
        Bouwplanning — het grote geheel per fase. De taken in &quot;Planning&quot; zijn hieraan gekoppeld en tellen automatisch mee als
        voortgang.
      </div>
      {phases.length === 0 ? (
        <div className="empty-hint">Nog geen bouwplanning toegevoegd.</div>
      ) : (
        <div className="gantt-scroll">
          <div className="gantt-grid" style={{ gridTemplateColumns: `180px repeat(${days.length}, 30px)` }}>
            <div className="gantt-cell gantt-corner" />
            {days.map((d, idx) => {
              const wd = d.getUTCDay();
              return (
                <div
                  key={idx}
                  className={"gantt-cell gantt-head" + (wd === 0 || wd === 6 ? " weekend" : "")}
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
              return (
                <div key={i.id} style={{ display: "contents" }}>
                  <div className="gantt-cell gantt-row-label">
                    <div className="gantt-row-title">{i.title}</div>
                    <div className="gantt-row-sub">
                      {i.assignee && <span>{i.assignee}</span>}
                      {linked.length > 0 && (
                        <span className="gantt-progress-tag">
                          {done}/{linked.length} taken
                        </span>
                      )}
                    </div>
                    {canEdit && (
                      <button
                        className="icon-btn danger ghost gantt-row-del"
                        onClick={() => startTransition(() => deletePhase(projectId, i.id).catch(() => {}))}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                  {days.map((d, idx) => {
                    const t = d.getTime();
                    const filled = t >= start && t <= end;
                    const isFirst = filled && t === start;
                    const isLast = filled && t === end;
                    const wd = d.getUTCDay();
                    return (
                      <div
                        key={idx}
                        className={
                          "gantt-cell gantt-daycell" +
                          (filled ? " filled" : "") +
                          (isFirst ? " first" : "") +
                          (isLast ? " last" : "") +
                          (!filled && (wd === 0 || wd === 6) ? " weekend" : "")
                        }
                        title={filled ? `${i.title}: ${i.start_date} – ${i.end_date}` : ""}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {!canEdit && phases.length > 0 && <div className="hint-bar small">Je kunt deze bouwplanning bekijken, maar niet wijzigen.</div>}

      {canEdit && (
        <div className="add-form">
          <div className="add-form-title">Planningsonderdeel toevoegen</div>
          <div className="add-form-grid">
            <input
              placeholder="Onderdeel (bv. Ruwbouw, Dakbedekking)"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <AssigneeInput value={form.assignee} onChange={(v) => setForm({ ...form, assignee: v })} teamMembers={teamMembers} />
            <input type="date" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
            <input type="date" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />
            <button className="btn-primary" onClick={addItem}>
              <Plus size={14} /> Toevoegen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
