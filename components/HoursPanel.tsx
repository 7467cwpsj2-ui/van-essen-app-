"use client";

import { useState, useTransition } from "react";
import { Download, Plus, Trash2, Zap } from "lucide-react";
import { createHourEntry, createWeekHourEntries, deleteHourEntry } from "@/lib/actions/hours";
import { weekdaysOfWeek } from "@/lib/workingDays";
import type { HourEntry, Role } from "@/types/database";

function fmtShort(iso: string) {
  return new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short" }).format(new Date(iso + "T00:00:00Z"));
}

function csvCell(v: string) {
  return `"${v.replace(/"/g, '""')}"`;
}

export function HoursPanel({
  projectId,
  projectName,
  role,
  currentTeamMemberId,
  isLocked,
  entries,
  teamMembers,
}: {
  projectId: string;
  projectName: string;
  role: Role;
  currentTeamMemberId: string | null;
  isLocked: boolean;
  entries: HourEntry[];
  teamMembers: { id: string; name: string }[];
}) {
  const todayIso = new Date().toISOString().slice(0, 10);
  const [mode, setMode] = useState<"dag" | "week">("dag");
  const [form, setForm] = useState({ teamMemberId: currentTeamMemberId || "", workDate: todayIso, hours: "", note: "" });
  const [, startTransition] = useTransition();

  const nameFor = (id: string) => teamMembers.find((m) => m.id === id)?.name || "—";

  const quickAdd = (hours: number) => {
    if (role === "eigenaar" && !form.teamMemberId) {
      alert("Kies hieronder eerst een teamlid.");
      return;
    }
    startTransition(() => {
      createHourEntry(projectId, { teamMemberId: form.teamMemberId, workDate: todayIso, hours, note: null }).catch((err) =>
        alert(err instanceof Error ? err.message : "Toevoegen mislukt.")
      );
    });
  };

  const add = () => {
    if (!form.workDate || !Number(form.hours)) return;
    startTransition(() => {
      if (mode === "week") {
        createWeekHourEntries(projectId, {
          teamMemberId: form.teamMemberId,
          weekDate: form.workDate,
          hoursPerDay: Number(form.hours),
          note: form.note || null,
        }).catch((err) => alert(err instanceof Error ? err.message : "Toevoegen mislukt."));
      } else {
        createHourEntry(projectId, {
          teamMemberId: form.teamMemberId,
          workDate: form.workDate,
          hours: Number(form.hours),
          note: form.note || null,
        }).catch((err) => alert(err instanceof Error ? err.message : "Toevoegen mislukt."));
      }
    });
    setForm({ teamMemberId: currentTeamMemberId || form.teamMemberId, workDate: todayIso, hours: "", note: "" });
  };

  const remove = (id: string) => {
    startTransition(() => {
      deleteHourEntry(projectId, id).catch((err) => alert(err instanceof Error ? err.message : "Verwijderen mislukt."));
    });
  };

  const exportCsv = () => {
    const rows = [...entries].sort((a, b) => (a.work_date < b.work_date ? -1 : 1));
    const header = ["Teamlid", "Datum", "Uren", "Opmerking"].map(csvCell).join(";");
    const lines = rows.map((e) => [nameFor(e.team_member_id), e.work_date, String(e.hours), e.note || ""].map(csvCell).join(";"));
    const csv = String.fromCharCode(0xfeff) + [header, ...lines].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `uren-${projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
      {entries.length > 0 && (
        <button type="button" className="btn-ghost" onClick={exportCsv} style={{ alignSelf: "flex-start" }}>
          <Download size={13} /> Exporteren (CSV)
        </button>
      )}

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
          <div className="add-form-title">Snel vandaag toevoegen</div>
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
          <div className="quick-hours-row">
            {[4, 6, 8].map((h) => (
              <button key={h} type="button" className="btn-ghost" onClick={() => quickAdd(h)}>
                <Zap size={13} /> {h} uur
              </button>
            ))}
          </div>

          <div className="add-form-title" style={{ marginTop: 6 }}>
            Andere datum / aantal / opmerking
          </div>
          <div className="mode-toggle">
            <button type="button" className={mode === "dag" ? "active" : ""} onClick={() => setMode("dag")}>
              Per dag
            </button>
            <button type="button" className={mode === "week" ? "active" : ""} onClick={() => setMode("week")}>
              Hele week
            </button>
          </div>
          <div className="add-form-grid">
            <label className="field-with-label">
              <span className="field-label">{mode === "week" ? "Een dag in die week" : "Datum"}</span>
              <input type="date" value={form.workDate} onChange={(e) => setForm({ ...form, workDate: e.target.value })} />
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              max="24"
              placeholder={mode === "week" ? "Uren per dag" : "Uren"}
              value={form.hours}
              onChange={(e) => setForm({ ...form, hours: e.target.value })}
            />
            <input placeholder="Opmerking (optioneel)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            <button className="btn-primary" onClick={add}>
              <Plus size={14} /> Toevoegen
            </button>
          </div>
          {mode === "week" && form.workDate && (
            <div className="hint-bar small">
              Dit registreert {form.hours || "…"} uur op elke werkdag van ma {fmtShort(weekdaysOfWeek(form.workDate)[0])} t/m vr{" "}
              {fmtShort(weekdaysOfWeek(form.workDate)[4])} (weekend telt niet mee).
            </div>
          )}
        </div>
      )}
    </div>
  );
}
