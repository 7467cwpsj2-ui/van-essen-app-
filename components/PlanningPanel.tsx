"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Circle, Plus, Trash2 } from "lucide-react";
import { createTask, deleteTask, toggleTask } from "@/lib/actions/tasks";
import { TASK_ASSIGNEE_LABEL, type Role, type Task, type TaskAssigneeType } from "@/types/database";

const VIS_CLASS: Record<TaskAssigneeType, string> = { eigenaar: "vis-private", team: "vis-public", klant: "vis-klant" };

function fmtDate(iso: string | null) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short" }).format(new Date(iso));
}

export function PlanningPanel({
  projectId,
  role,
  currentTeamMemberId,
  isLocked,
  tasks,
  teamMembers,
  hideAddForm,
}: {
  projectId: string;
  role: Role;
  currentTeamMemberId: string | null;
  isLocked: boolean;
  tasks: Task[];
  teamMembers: { id: string; name: string }[];
  hideAddForm?: boolean;
}) {
  const [form, setForm] = useState<{ title: string; assigneeType: TaskAssigneeType; assigneeTeamMemberIds: string[]; dueDate: string }>({
    title: "",
    assigneeType: "eigenaar",
    assigneeTeamMemberIds: [],
    dueDate: "",
  });
  const [, startTransition] = useTransition();

  const teamMemberName = (id: string) => teamMembers.find((m) => m.id === id)?.name;

  const assigneeLabel = (t: Task) => {
    if (t.assignee_type !== "team") return TASK_ASSIGNEE_LABEL[t.assignee_type];
    if (t.assignee_team_member_ids.length === 0) return "Team (iedereen)";
    return t.assignee_team_member_ids.map((id) => teamMemberName(id) || "?").join(", ");
  };

  const canToggle = (t: Task) => {
    if (isLocked) return false;
    if (role === "eigenaar") return true;
    if (role === "team")
      return (
        t.assignee_type === "team" &&
        (t.assignee_team_member_ids.length === 0 || (!!currentTeamMemberId && t.assignee_team_member_ids.includes(currentTeamMemberId)))
      );
    if (role === "klant") return t.assignee_type === "klant";
    return false;
  };

  const canCreate = (role === "eigenaar" || role === "team") && !isLocked && !hideAddForm;

  const toggleFormMember = (id: string) => {
    setForm((f) => ({
      ...f,
      assigneeTeamMemberIds: f.assigneeTeamMemberIds.includes(id)
        ? f.assigneeTeamMemberIds.filter((x) => x !== id)
        : [...f.assigneeTeamMemberIds, id],
    }));
  };

  const addTask = () => {
    if (!form.title.trim()) return;
    startTransition(() => {
      createTask(projectId, {
        title: form.title,
        assigneeType: form.assigneeType,
        assigneeTeamMemberIds: form.assigneeType === "team" ? form.assigneeTeamMemberIds : [],
        dueDate: form.dueDate || null,
      }).catch((err) => alert(err instanceof Error ? err.message : "Toevoegen mislukt."));
    });
    setForm({ title: "", assigneeType: "eigenaar", assigneeTeamMemberIds: [], dueDate: "" });
  };

  const sorted = [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    return a.created_at.localeCompare(b.created_at);
  });

  return (
    <div className="panel">
      {!hideAddForm && (
        <div className="hint-bar">
          Losse actiepunten en herinneringen — “bel leverancier”, “zoek iets uit”, “regel iets”. Wijs toe aan jezelf, het team, of de
          klant; alleen die persoon (of jij als eigenaar) kan het afvinken.
        </div>
      )}
      {tasks.length === 0 && <div className="empty-hint">Nog niets te doen.</div>}
      <div className="task-list">
        {sorted.map((t) => {
          const toggleable = canToggle(t);
          return (
            <div key={t.id} className={"task-row" + (t.done ? " done" : "")}>
              <button
                className="task-check"
                onClick={() => toggleable && startTransition(() => toggleTask(projectId, t.id, !t.done).catch(() => {}))}
                disabled={!toggleable}
                title={toggleable ? undefined : "Alleen de toegewezen persoon kan dit afvinken"}
              >
                {t.done ? <CheckCircle2 size={19} /> : <Circle size={19} />}
              </button>
              <div className="task-body">
                <div className="task-title">{t.title}</div>
                <div className="task-meta">
                  <span className={"vis-pill " + VIS_CLASS[t.assignee_type]}>{assigneeLabel(t)}</span>
                  {t.due_date && <span className="mono">{fmtDate(t.due_date)}</span>}
                  {t.done && t.done_by && <span>Afgevinkt door {t.done_by}</span>}
                </div>
              </div>
              {role === "eigenaar" && !isLocked && (
                <button className="icon-btn danger ghost" onClick={() => startTransition(() => deleteTask(projectId, t.id).catch(() => {}))}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {canCreate && (
        <div className="add-form">
          <div className="add-form-title">Nieuw actiepunt</div>
          <div className="add-form-grid">
            <input
              placeholder="Wat moet er gebeuren?"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <select
              value={form.assigneeType}
              onChange={(e) =>
                setForm({
                  ...form,
                  assigneeType: e.target.value as TaskAssigneeType,
                  assigneeTeamMemberIds: e.target.value === "team" && role === "team" && currentTeamMemberId ? [currentTeamMemberId] : [],
                })
              }
            >
              <option value="eigenaar">{role === "eigenaar" ? "Mijzelf" : "Eigenaar"}</option>
              <option value="team">Team</option>
              {role === "eigenaar" && <option value="klant">Klant</option>}
            </select>
            <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            <button className="btn-primary" onClick={addTask}>
              <Plus size={14} /> Toevoegen
            </button>
          </div>
          {form.assigneeType === "team" && teamMembers.length > 0 && (
            <div className="task-team-picker">
              <div className="task-team-picker-hint">Niemand aangevinkt = iedereen in het team kan het afvinken.</div>
              <div className="task-team-picker-grid">
                {role === "team" && currentTeamMemberId && (
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={form.assigneeTeamMemberIds.includes(currentTeamMemberId)}
                      onChange={() => toggleFormMember(currentTeamMemberId)}
                    />
                    Mijzelf
                  </label>
                )}
                {teamMembers
                  .filter((m) => m.id !== currentTeamMemberId)
                  .map((m) => (
                    <label key={m.id} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={form.assigneeTeamMemberIds.includes(m.id)}
                        onChange={() => toggleFormMember(m.id)}
                      />
                      {m.name}
                    </label>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
