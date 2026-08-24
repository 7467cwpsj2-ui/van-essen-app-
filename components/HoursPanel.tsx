"use client";

import { useEffect, useState, useTransition } from "react";
import { Calendar, Check, ChevronDown, Download, Pencil, Plus, Trash2, X, Zap } from "lucide-react";
import { createHourEntry, createWeekHourEntries, deleteHourEntry, updateHourEntry, type HoursTarget } from "@/lib/actions/hours";
import { mondayOfWeek, weekdaysOfWeek } from "@/lib/workingDays";
import type { HourEntry, Role } from "@/types/database";

function fmtShort(iso: string) {
  return new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short" }).format(new Date(iso + "T00:00:00Z"));
}

// Inclusief weekdag, want "2026-08-24" is bij een lijst met losse
// registraties niet in één oogopslag te lezen — welke dag het precies
// was, is nu meteen duidelijk.
function fmtDay(iso: string) {
  return new Intl.DateTimeFormat("nl-NL", { weekday: "short", day: "numeric", month: "short" }).format(new Date(iso + "T00:00:00Z"));
}

function csvCell(v: string) {
  return `"${v.replace(/"/g, '""')}"`;
}

interface WeekGroup {
  monday: string;
  rows: HourEntry[];
  total: number;
}

function groupByWeek(rows: HourEntry[]): WeekGroup[] {
  const map = new Map<string, HourEntry[]>();
  for (const r of rows) {
    const monday = mondayOfWeek(r.work_date);
    if (!map.has(monday)) map.set(monday, []);
    map.get(monday)!.push(r);
  }
  return Array.from(map.entries())
    .map(([monday, rows]) => ({
      monday,
      rows: [...rows].sort((a, b) => (a.work_date < b.work_date ? 1 : -1)),
      total: rows.reduce((s, e) => s + Number(e.hours), 0),
    }))
    .sort((a, b) => (a.monday < b.monday ? 1 : -1));
}

export function HoursPanel({
  target,
  targetName,
  role,
  currentTeamMemberId,
  isLocked,
  entries,
  teamMembers,
  autoOpenDetail,
}: {
  target: HoursTarget;
  targetName: string;
  role: Role;
  currentTeamMemberId: string | null;
  isLocked: boolean;
  entries: HourEntry[];
  teamMembers: { id: string; name: string }[];
  autoOpenDetail?: boolean;
}) {
  const todayIso = new Date().toISOString().slice(0, 10);
  const currentWeekMonday = mondayOfWeek(todayIso);
  const [mode, setMode] = useState<"dag" | "week">("dag");
  const [form, setForm] = useState({ teamMemberId: currentTeamMemberId || "", workDate: todayIso, hours: "", note: "" });
  const [showDetail, setShowDetail] = useState(!!autoOpenDetail);

  // De uren-picker (UrenPicker) kan hierheen linken met ?open=1, bijv.
  // vanuit de "Anders…"-knop — omdat dit dezelfde paginacomponent kan
  // blijven (alleen de zoekparameter wijzigt), volstaat de useState-
  // initiële waarde hierboven niet altijd; dit vangt ook die her-render
  // op zonder volledige remount.
  useEffect(() => {
    if (autoOpenDetail) setShowDetail(true);
  }, [autoOpenDetail]);
  const [openWeeks, setOpenWeeks] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ workDate: "", hours: "", note: "" });
  const [, startTransition] = useTransition();

  const nameFor = (id: string) => teamMembers.find((m) => m.id === id)?.name || "—";

  const toggleWeek = (key: string, defaultOpen: boolean) => {
    setOpenWeeks((prev) => ({ ...prev, [key]: !(prev[key] ?? defaultOpen) }));
  };

  // Gebruikt bewust form.workDate (staat standaard op vandaag) i.p.v.
  // altijd todayIso — anders zou deze knop stilzwijgend op "vandaag"
  // blijven loggen zelfs nadat iemand hieronder al een andere datum had
  // ingevuld, wat verwarrend bleek. Nu volgt de knop gewoon de datum die
  // op dat moment ingevuld staat, en de knoptekst laat dat ook zien.
  const quickAdd = (hours: number) => {
    if (role === "eigenaar" && !form.teamMemberId) {
      alert("Kies hieronder eerst een teamlid.");
      return;
    }
    startTransition(() => {
      createHourEntry(target, { teamMemberId: form.teamMemberId, workDate: form.workDate, hours, note: null }).catch((err) =>
        alert(err instanceof Error ? err.message : "Toevoegen mislukt.")
      );
    });
  };

  const add = () => {
    if (!form.workDate || !Number(form.hours)) return;
    startTransition(() => {
      if (mode === "week") {
        createWeekHourEntries(target, {
          teamMemberId: form.teamMemberId,
          weekDate: form.workDate,
          hoursPerDay: Number(form.hours),
          note: form.note || null,
        }).catch((err) => alert(err instanceof Error ? err.message : "Toevoegen mislukt."));
      } else {
        createHourEntry(target, {
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
      deleteHourEntry(target, id).catch((err) => alert(err instanceof Error ? err.message : "Verwijderen mislukt."));
    });
  };

  const startEdit = (e: HourEntry) => {
    setEditingId(e.id);
    setEditDraft({ workDate: e.work_date, hours: String(e.hours), note: e.note || "" });
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = (id: string) => {
    if (!editDraft.workDate || !Number(editDraft.hours)) return;
    startTransition(() => {
      updateHourEntry(target, id, {
        workDate: editDraft.workDate,
        hours: Number(editDraft.hours),
        note: editDraft.note || null,
      }).catch((err) => alert(err instanceof Error ? err.message : "Opslaan mislukt."));
    });
    setEditingId(null);
  };

  const exportCsv = () => {
    const rows = [...entries].sort((a, b) => (a.work_date < b.work_date ? -1 : 1));
    const header = ["Teamlid", "Datum", "Uren", "Opmerking"].map(csvCell).join(";");
    const lines = rows.map((e) => [nameFor(e.team_member_id), e.work_date, String(e.hours), e.note || ""].map(csvCell).join(";"));
    const csv = String.fromCharCode(0xfeff) + [header, ...lines].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `uren-${targetName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const grandTotal = entries.reduce((s, e) => s + Number(e.hours), 0);

  const groups =
    role === "eigenaar"
      ? Array.from(new Set(entries.map((e) => e.team_member_id))).map((id) => ({
          id,
          name: nameFor(id),
          rows: entries.filter((e) => e.team_member_id === id),
        }))
      : [{ id: "self", name: "Mijn uren", rows: entries }];

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

      {!isLocked && (
        <div className="add-form">
          <div className="add-form-title">
            {form.workDate === todayIso ? "Snel vandaag toevoegen" : `Snel toevoegen — ${fmtDay(form.workDate)}`}
          </div>
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
          {form.workDate !== todayIso && (
            <div className="hint-bar small">
              Let op: deze knoppen zetten uren op <b>{fmtDay(form.workDate)}</b>, niet vandaag — dat is de datum die hieronder is
              ingevuld. Wil je toch vandaag? Zet de datum hieronder terug op vandaag.
            </div>
          )}
          <div className="quick-hours-row">
            {[4, 6, 8].map((h) => (
              <button key={h} type="button" className="btn-ghost" onClick={() => quickAdd(h)}>
                <Zap size={13} /> {h} uur
              </button>
            ))}
          </div>

          {!showDetail ? (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setShowDetail(true)}
              style={{ alignSelf: "flex-start", marginTop: 18 }}
            >
              <Calendar size={13} /> Andere datum, aantal of opmerking invoeren
            </button>
          ) : (
            <>
              <div className="add-form-title" style={{ marginTop: 18 }}>
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
                  <span className="field-label">
                    {mode === "week" ? "Een dag in die week" : "Datum"}
                    {form.workDate !== todayIso && (
                      <button type="button" className="link-btn" style={{ marginLeft: 8 }} onClick={() => setForm({ ...form, workDate: todayIso })}>
                        Terug naar vandaag
                      </button>
                    )}
                  </span>
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
                <input
                  placeholder="Opmerking (optioneel)"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                />
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
            </>
          )}
        </div>
      )}

      <div className="hours-log-divider">
        <span>Geregistreerde uren</span>
      </div>

      {groups.length === 0 && <div className="empty-hint">Nog geen uren geregistreerd.</div>}
      {groups.map((g) => {
        const total = g.rows.reduce((s, e) => s + Number(e.hours), 0);
        const weeks = groupByWeek(g.rows);
        return (
          <div key={g.id}>
            {role === "eigenaar" && (
              <div className="dash-section-title">
                {g.name} · <span className="mono">{total} uur</span>
              </div>
            )}
            {weeks.map((wg) => {
              const key = `${g.id}:${wg.monday}`;
              const defaultOpen = wg.monday === currentWeekMonday;
              const open = openWeeks[key] ?? defaultOpen;
              const sunday = new Date(new Date(wg.monday + "T00:00:00Z").getTime() + 6 * 86400000).toISOString().slice(0, 10);
              return (
                <div key={key} className="hours-week-group">
                  <button type="button" className="hours-week-header" onClick={() => toggleWeek(key, defaultOpen)}>
                    <ChevronDown size={13} className={"access-chevron" + (open ? " open" : "")} />
                    <span>
                      Week van {fmtShort(wg.monday)} t/m {fmtShort(sunday)}
                    </span>
                    <span className="mono">{wg.total} uur</span>
                  </button>
                  {open && (
                    <div className="task-list">
                      {wg.rows.map((e) => {
                        const canEdit = !isLocked && (role === "eigenaar" || e.team_member_id === currentTeamMemberId);
                        return editingId === e.id ? (
                          <div key={e.id} className="add-form">
                            <div className="add-form-grid">
                              <input
                                type="date"
                                value={editDraft.workDate}
                                onChange={(ev) => setEditDraft({ ...editDraft, workDate: ev.target.value })}
                              />
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                max="24"
                                placeholder="Uren"
                                value={editDraft.hours}
                                onChange={(ev) => setEditDraft({ ...editDraft, hours: ev.target.value })}
                              />
                              <input
                                placeholder="Opmerking (optioneel)"
                                value={editDraft.note}
                                onChange={(ev) => setEditDraft({ ...editDraft, note: ev.target.value })}
                              />
                            </div>
                            <div className="dossier-status-actions">
                              <button className="btn-primary" onClick={() => saveEdit(e.id)}>
                                <Check size={14} /> Opslaan
                              </button>
                              <button className="btn-ghost" onClick={cancelEdit}>
                                <X size={14} /> Annuleren
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div key={e.id} className="task-row">
                            <div className="task-body">
                              <div className="task-title mono">
                                {fmtDay(e.work_date)} · {e.hours} uur
                              </div>
                              {e.note && <div className="task-meta">{e.note}</div>}
                            </div>
                            {canEdit && (
                              <div style={{ display: "flex", gap: 4 }}>
                                <button className="icon-btn ghost" title="Aanpassen" onClick={() => startEdit(e)}>
                                  <Pencil size={14} />
                                </button>
                                <button className="icon-btn danger ghost" title="Verwijderen" onClick={() => remove(e.id)}>
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
