"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createHourEntry, deleteHourEntry } from "@/lib/actions/hours";
import type { HourEntry, Role } from "@/types/database";

export function HoursPanel({
  projectId,
  role,
  currentTeamMemberId,
  isLocked,
  entries,
  teamMembers,
}: {
  projectId: string;
  role: Role;
  currentTeamMemberId: string | null;
  isLocked: boolean;
  entries: HourEntry[];
  teamMembers: { id: string; name: string }[];
}) {
  const [form, setForm] = useState({ teamMemberId: currentTeamMemberId || "", workDate: "", hours: "", note: "" });
  const [, startTransition] = useTransition();

  const nameFor = (id: string) => teamMembers.find((m) => m.id === id)?.name || "—";

  const add = () => {
    if (!form.workDate || !Number(form.hours)) return;
    startTransition(() => {
      createHourEntry(projectId, {
        teamMemberId: form.teamMemberId,
        workDate: form.workDate,
        hours: Number(form.hours),
        note: form.note || null,
      }).catch((err) => alert(err instanceof Error ? err.message : "Toevoegen mislukt."));
    });
    setForm({ teamMemberId: currentTeamMemberId || form.teamMemberId, workDate: "", hours: "", note: "" });
  };

  const remove = (id: string) => {
    startTransition(() => {
      deleteHourEntry(projectId, id).catch((err) => alert(err instanceof Error ? err.message : "Verwijderen mislukt."));
    });
  };

  const grandTotal = entries.reduce((s, e) => s + Number(e.hours), 0);

  const groups =
    role === "eigenaar"
      ? Array.from(new Set(entries.map((e) => e.team_member_id))).map((id) => ({
          id,
          name: nameFor(id),
          rows: entries.filter((e) => e.team_member_id === id).sort((a, b) => (a.work_date < b.work_date ? 1 : -1)),
        }))
      : [{ id: "self", name: "Mijn uren", rows: [...entries].sort((a, b) => (a.work_date < b.work_date ? 1 : -1)) }];

  return (
    <div className="panel">
      <div className="hint-bar">Uren zijn altijd intern — de klant ziet dit nooit.</div>
      <div className="dash-cards">
        <div className="dash-card">
          <div className="dash-card-value">{grandTotal}</div>
          <div className="dash-card-title">{role === "eigenaar" ? "Totaal uren (iedereen)" : "Mijn totaal uren"}</div>
        </div>
      </div>

      {groups.length === 0 && <div className="empty-hint">Nog geen uren geregistreerd.</div>}
      {groups.map((g) => {
        const total = g.rows.reduce((s, e) => s + Number(e.hours), 0);
        return (
          <div key={g.id}>
            {role === "eigenaar" && (
              <div className="dash-section-title">
                {g.name} · <span className="mono">{total} uur</span>
              </div>
            )}
            <div className="task-list">
              {g.rows.map((e) => {
                const canDelete = !isLocked && (role === "eigenaar" || e.team_member_id === currentTeamMemberId);
                return (
                  <div key={e.id} className="task-row">
                    <div className="task-body">
                      <div className="task-title mono">
                        {e.work_date} · {e.hours} uur
                      </div>
                      {e.note && <div className="task-meta">{e.note}</div>}
                    </div>
                    {canDelete && (
                      <button className="icon-btn danger ghost" onClick={() => remove(e.id)}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {!isLocked && (
        <div className="add-form">
          <div className="add-form-title">Uren registreren</div>
          <div className="add-form-grid">
            {role === "eigenaar" && (
              <select value={form.teamMemberId} onChange={(e) => setForm({ ...form, teamMemberId: e.target.value })}>
                <option value="">Kies teamlid</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            )}
            <input type="date" value={form.workDate} onChange={(e) => setForm({ ...form, workDate: e.target.value })} />
            <input
              type="number"
              step="0.5"
              min="0"
              max="24"
              placeholder="Uren"
              value={form.hours}
              onChange={(e) => setForm({ ...form, hours: e.target.value })}
            />
            <input placeholder="Opmerking (optioneel)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            <button className="btn-primary" onClick={add}>
              <Plus size={14} /> Toevoegen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
