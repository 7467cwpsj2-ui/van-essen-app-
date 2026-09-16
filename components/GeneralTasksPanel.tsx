"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Circle, Plus, Trash2 } from "lucide-react";
import { createGeneralTask, deleteGeneralTask, toggleGeneralTask } from "@/lib/actions/generalTasks";
import { TASK_ASSIGNEE_LABEL, type GeneralTask, type GeneralTaskAssigneeType, type Role, type TeamMemberType } from "@/types/database";

const VIS_CLASS: Record<GeneralTaskAssigneeType, string> = { eigenaar: "vis-private", team: "vis-public" };

type UiAssigneeType = GeneralTaskAssigneeType | "personeel";

function fmtDate(iso: string | null) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short" }).format(new Date(iso));
}

export function GeneralTasksPanel({
  role,
  currentTeamMemberId,
  tasks,
  teamMembers,
}: {
  role: Role;
  currentTeamMemberId: string | null;
  tasks: GeneralTask[];
  teamMembers: { id: string; name: string; member_type: TeamMemberType }[];
}) {
  const [form, setForm] = useState<{ title: string; assigneeType: UiAssigneeType; assigneeTeamMemberIds: string[]; dueDate: string }>({
    title: "",
    assigneeType: "eigenaar",
    assigneeTeamMemberIds: [],
    dueDate: "",
  });
  const [showAdd, setShowAdd] = useState(false);
  const [, startTransition] = useTransition();

  const teamMemberName = (id: string) => teamMembers.find((m) => m.id === id)?.name;
  const currentMemberType = teamMembers.find((m) => m.id === currentTeamMemberId)?.member_type;
  const pickerCategory: TeamMemberType = form.assigneeType === "personeel" ? "personeel" : "onderaannemer";
  const pickerMembers = teamMembers.filter((m) => m.member_type === pickerCategory);

  const assigneeLabel = (t: GeneralTask) => {
    if (t.assignee_type !== "team") return TASK_ASSIGNEE_LABEL[t.assignee_type];
    if (t.assignee_team_member_ids.length === 0) return "Team (iedereen)";
    return t.assignee_team_member_ids.map((id) => teamMemberName(id) || "?").join(", ");
  };

  const canToggle = (t: GeneralTask) => {
    if (role === "eigenaar") return true;
    if (role === "team")
      return (
        t.assignee_type === "team" &&
        (t.assignee_team_member_ids.length === 0 || (!!currentTeamMemberId && t.assignee_team_member_ids.includes(currentTeamMemberId)))
      );
    return false;
  };

  const canCreate = role === "eigenaar" || role === "team";
  if (!canCreate) return null;

  const toggleFormMember = (id: string) => {
    setForm((f) => ({
      ...f,
      assigneeTeamMemberIds: f.assigneeTeamMemberIds.includes(id)
        ? f.assigneeTeamMemberIds.filter((x) => x !== id)
        : [...f.assigneeTeamMemberIds, id],
    }));
  };

  const closeAdd = () => {
    setForm({ title: "", assigneeType: "eigenaar", assigneeTeamMemberIds: [], dueDate: "" });
    setShowAdd(false);
  };

  const addTask = () => {
    if (!form.title.trim()) return;
    const isStaffPick = form.assigneeType === "team" || form.assigneeType === "personeel";
    startTransition(() => {
      createGeneralTask({
        title: form.title,
        assigneeType: form.assigneeType === "personeel" ? "team" : form.assigneeType,
        assigneeTeamMemberIds: isStaffPick ? form.assigneeTeamMemberIds : [],
        dueDate: form.dueDate || null,
      }).catch((err) => alert(err instanceof Error ? err.message : "Toevoegen mislukt."));
    });
    closeAdd();
  };

  const todayIso = new Date().toISOString().slice(0, 10);

  const sorted = [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    return a.created_at.localeCompare(b.created_at);
  });

  return (
    <div className="panel">
      <button type="button" className="btn-primary" onClick={() => setShowAdd(true)} style={{ alignSelf: "flex-start" }}>
        <Plus size={14} /> Algemeen te doen toevoegen
      </button>
      {tasks.length === 0 && <div className="empty-hint">Nog niets algemeens te doen.</div>}
      <div className="task-list">
        {sorted.map((t) => {
          const toggleable = canToggle(t);
          return (
            <div
              key={t.id}
              className={"task-row" + (t.done ? " done" : "") + (!t.done && t.due_date && t.due_date < todayIso ? " overdue" : "")}
            >
              <button
                className="task-check"
                onClick={() => toggleable && startTransition(() => toggleGeneralTask(t.id, !t.done).catch(() => {}))}
                disabled={!toggleable}
                title={toggleable ? undefined : "Alleen de toegewezen persoon kan dit afvinken"}
              >
                {t.done ? <CheckCircle2 size={19} /> : <Circle size={19} />}
              </button>
              <div className="task-body">
                <div className="task-title">{t.title}</div>
                <div className="task-meta">
                  <span className={"vis-pill " + VIS_CLASS[t.assignee_type]}>{assigneeLabel(t)}</span>
                  {t.due_date && (
                    <span className={"mono" + (!t.done && t.due_date < todayIso ? " task-overdue" : "")}>
                      Deadline: {fmtDate(t.due_date)}
                    </span>
                  )}
                  {t.done && t.done_by && <span>Afgevinkt door {t.done_by}</span>}
                </div>
              </div>
              {role === "eigenaar" && (
                <button
                  className="icon-btn danger ghost"
                  title="Verwijderen"
                  onClick={() => startTransition(() => deleteGeneralTask(t.id).catch(() => {}))}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {showAdd && (
        <div className="sig-overlay" onClick={closeAdd}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "85vh", overflowY: "auto" }}>
            <div className="modal-title">Algemeen te doen toevoegen</div>
            <div className="add-form-grid">
              <input
                placeholder="Wat moet er gebeuren?"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              <select
                value={form.assigneeType}
                onChange={(e) => {
                  const next = e.target.value as UiAssigneeType;
                  const nextCategory: TeamMemberType = next === "personeel" ? "personeel" : "onderaannemer";
                  const autoSelf =
                    (next === "team" || next === "personeel") && role === "team" && currentTeamMemberId && currentMemberType === nextCategory;
                  setForm({
                    ...form,
                    assigneeType: next,
                    assigneeTeamMemberIds: autoSelf ? [currentTeamMemberId as string] : [],
                  });
                }}
              >
                <option value="eigenaar">{role === "eigenaar" ? "Mijzelf" : "Eigenaar"}</option>
                <option value="team">Team / onderaannemer</option>
                <option value="personeel">Eigen personeel</option>
              </select>
              <label className="field-with-label">
                <span className="field-label">Deadline (optioneel)</span>
                <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              </label>
            </div>
            {(form.assigneeType === "team" || form.assigneeType === "personeel") && (
              <div className="task-team-picker">
                <div className="task-team-picker-hint">
                  {pickerMembers.length === 0
                    ? form.assigneeType === "personeel"
                      ? "Nog geen eigen personeel toegevoegd op de Personeel-pagina."
                      : "Nog geen team/onderaannemers toegevoegd."
                    : "Niemand aangevinkt = iedereen in deze groep kan het afvinken."}
                </div>
                <div className="task-team-picker-grid">
                  {role === "team" && currentTeamMemberId && currentMemberType === pickerCategory && (
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={form.assigneeTeamMemberIds.includes(currentTeamMemberId)}
                        onChange={() => toggleFormMember(currentTeamMemberId)}
                      />
                      Mijzelf
                    </label>
                  )}
                  {pickerMembers
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
            <div className="modal-actions">
              <button type="button" className="btn-ghost" onClick={closeAdd}>
                Annuleren
              </button>
              <button type="button" className="btn-primary" onClick={addTask}>
                <Plus size={14} /> Toevoegen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
