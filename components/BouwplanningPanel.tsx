"use client";

import { Fragment, useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Lock, MoreVertical, Pencil, Plus, Trash2, Unlock, X } from "lucide-react";
import { AssigneeInput, type AssigneeTeamMember } from "@/components/AssigneeInput";
import { ScrollToToday } from "@/components/ScrollToToday";
import { createPhase, deletePhase, setPhaseFixedDate, updatePhaseColor, updatePhaseDates } from "@/lib/actions/schedule";
import { colorForKey } from "@/lib/projectColor";
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
  const [editForm, setEditForm] = useState({ assignee: "", assigneeTeamMemberIds: [] as string[], start: "", days: "" });
  const [showAdd, setShowAdd] = useState(false);
  const [detailPhase, setDetailPhase] = useState<SchedulePhase | null>(null);
  const [, startTransition] = useTransition();

  // Rij-menu (hangslot/datums/verwijderen samengevoegd tot één "•••" i.p.v.
  // drie losse knopjes naast elkaar) — zelfde patroon als het bestaande
  // project-overflow-menu bij "project verwijderen".
  const [rowMenuPhaseId, setRowMenuPhaseId] = useState<string | null>(null);
  const [rowMenuPos, setRowMenuPos] = useState<{ top: number; left: number } | null>(null);
  const rowMenuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const rowMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!rowMenuPhaseId) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rowMenuTriggerRef.current?.contains(target) || rowMenuRef.current?.contains(target)) return;
      setRowMenuPhaseId(null);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [rowMenuPhaseId]);

  const toggleRowMenu = (phaseId: string, trigger: HTMLButtonElement) => {
    if (rowMenuPhaseId === phaseId) {
      setRowMenuPhaseId(null);
      rowMenuTriggerRef.current = null;
      return;
    }
    const rect = trigger.getBoundingClientRect();
    setRowMenuPos({ top: rect.bottom + 4, left: rect.right - 190 });
    rowMenuTriggerRef.current = trigger;
    setRowMenuPhaseId(phaseId);
  };

  // De uitleg-banner ("Bouwplanning — het grote geheel...") hoef je maar
  // één keer te lezen — neemt daarna puur ruimte weg boven de tabel.
  const [hintDismissed, setHintDismissed] = useState(true);
  useEffect(() => {
    setHintDismissed(localStorage.getItem("bouwplanning-hint-dismissed") === "1");
  }, []);
  const dismissHint = () => {
    localStorage.setItem("bouwplanning-hint-dismissed", "1");
    setHintDismissed(true);
  };

  // Liggend op een telefoon (smal scherm, laag) -> de Gantt-tabel vult
  // het hele scherm, zonder app-chrome eromheen. Puur op hoogte + oriëntatie
  // gebaseerd (niet op breedte) zodat dit ook klopt op telefoons die
  // liggend de desktop-indeling-breakpoint passeren. draait de telefoon
  // weer rechtop, dan verdwijnt dit vanzelf (matchMedia reageert live) en
  // wordt een eventuele handmatige sluiting hieronder gereset.
  const [isLandscapePhone, setIsLandscapePhone] = useState(false);
  const [fullscreenDismissed, setFullscreenDismissed] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(orientation: landscape) and (max-height: 500px)");
    const onChange = (e: MediaQueryList | MediaQueryListEvent) => {
      setIsLandscapePhone(e.matches);
      if (!e.matches) setFullscreenDismissed(false);
    };
    onChange(mq);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  const fullscreenActive = isLandscapePhone && !fullscreenDismissed;
  useEffect(() => {
    document.body.classList.toggle("gantt-landscape-fullscreen", fullscreenActive);
    return () => document.body.classList.remove("gantt-landscape-fullscreen");
  }, [fullscreenActive]);

  const teamMemberName = (id: string) => teamMembers.find((m) => m.id === id)?.name || "?";
  const phaseAssigneeLabel = (p: SchedulePhase) =>
    p.assignee_team_member_ids.length > 0 ? p.assignee_team_member_ids.map(teamMemberName).join(", ") : p.assignee;

  const computedEnd = form.start && Number(form.days) >= 1 ? endDateForWorkingDays(form.start, Number(form.days)) : "";

  const closeAdd = () => {
    setForm({ title: "", assignee: "", assigneeTeamMemberIds: [], start: "", days: "", fixedDate: false });
    setShowAdd(false);
  };

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
    closeAdd();
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
    setEditForm({ assignee: p.assignee ?? "", assigneeTeamMemberIds: p.assignee_team_member_ids, start: p.start_date, days: String(count || 1) });
  };

  const editComputedEnd =
    editForm.start && Number(editForm.days) >= 1 ? endDateForWorkingDays(editForm.start, Number(editForm.days)) : "";

  const saveEditPhase = () => {
    if (!editingId || !editForm.start || !editComputedEnd) return;
    const id = editingId;
    startTransition(() => {
      updatePhaseDates(projectId, id, {
        start: editForm.start,
        end: editComputedEnd,
        assignee: editForm.assignee,
        assigneeTeamMemberIds: editForm.assigneeTeamMemberIds,
      }).catch((err) => alert(err instanceof Error ? err.message : "Opslaan mislukt."));
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
    <div className="panel panel-wide">
      {fullscreenActive && (
        <button
          type="button"
          className="gantt-fullscreen-exit"
          onClick={() => setFullscreenDismissed(true)}
          title="Volledig scherm verlaten"
        >
          <X size={16} />
        </button>
      )}
      {!fullscreenActive && !hintDismissed && (
        <div className="hint-bar hint-bar-dismissible">
          <button type="button" className="icon-btn ghost hint-bar-dismiss" onClick={dismissHint} title="Niet meer tonen">
            <X size={13} />
          </button>
          Bouwplanning — het grote geheel per fase. De taken in &quot;Planning&quot; zijn hieraan gekoppeld en tellen automatisch mee als
          voortgang.
        </div>
      )}
      {!fullscreenActive && Object.keys(conflicts).length > 0 && (
        <div className="hint-bar conflict-bar">
          <AlertTriangle size={13} style={{ display: "inline", marginRight: 6, verticalAlign: -2 }} />
          Let op: sommige fases hieronder overlappen met een planning op een ander project voor dezelfde persoon — zie het
          waarschuwingsicoontje bij de betreffende fase.
        </div>
      )}
      {canEdit && (
        <button type="button" className="btn-primary" onClick={() => setShowAdd(true)} style={{ alignSelf: "flex-start" }}>
          <Plus size={14} /> Planningsonderdeel toevoegen
        </button>
      )}
      {phases.length === 0 ? (
        <div className="empty-hint">Nog geen bouwplanning toegevoegd.</div>
      ) : (
        <ScrollToToday todayIdx={todayIdx}>
          <div className="gantt-grid" style={{ gridTemplateColumns: `220px repeat(${days.length}, 30px)` }}>
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
              const phaseColor = i.color || colorForKey(phaseAssigneeLabel(i) || i.title);
              return (
                <Fragment key={i.id}>
                  <div
                    className={
                      "gantt-cell gantt-row-label" +
                      (canEdit ? " gantt-row-label-actions" : "") +
                      (conflicts[i.id] ? " has-conflict" : "")
                    }
                  >
                    <div className="gantt-row-title">
                      {canEdit ? (
                        <input
                          type="color"
                          value={phaseColor}
                          onChange={(e) => startTransition(() => updatePhaseColor(projectId, i.id, e.target.value).catch(() => {}))}
                          onClick={(e) => e.stopPropagation()}
                          className="planning-legend-swatch gantt-row-swatch-input"
                          title="Kleur van deze fase aanpassen"
                        />
                      ) : (
                        <span className="gantt-row-swatch" style={{ background: phaseColor }} />
                      )}
                      <span className="gantt-row-title-text">{i.title}</span>
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
                          title="Meer opties"
                          onClick={(e) => toggleRowMenu(i.id, e.currentTarget)}
                        >
                          <MoreVertical size={14} />
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
                          (filled ? " filled clickable" : "") +
                          (isFirst ? " first" : "") +
                          (isLast ? " last" : "") +
                          (wd === 0 || wd === 6 ? " weekend" : "")
                        }
                        style={filled ? { background: phaseColor } : undefined}
                        title={filled ? `${i.title}: ${i.start_date} – ${i.end_date}` : ""}
                        onClick={() => filled && setDetailPhase(i)}
                      />
                    );
                  })}
                </Fragment>
              );
            })}

            {todayIdx >= 0 && <div className="gantt-today-line" style={{ left: `${220 + todayIdx * 30 + 15}px` }} title="Vandaag" />}
          </div>
        </ScrollToToday>
      )}
      {!canEdit && phases.length > 0 && <div className="hint-bar small">Je kunt deze bouwplanning bekijken, maar niet wijzigen.</div>}

      {rowMenuPhaseId &&
        rowMenuPos &&
        typeof document !== "undefined" &&
        (() => {
          const menuPhase = phases.find((p) => p.id === rowMenuPhaseId);
          if (!menuPhase) return null;
          return createPortal(
            <div ref={rowMenuRef} className="project-overflow-menu" style={{ position: "fixed", top: rowMenuPos.top, left: rowMenuPos.left }}>
              <button
                type="button"
                className="project-overflow-item"
                onClick={() => {
                  toggleFixed(menuPhase);
                  setRowMenuPhaseId(null);
                }}
              >
                {menuPhase.fixed_date ? <Unlock size={14} /> : <Lock size={14} />}
                {menuPhase.fixed_date ? "Weer laten meeschuiven" : "Niet meer laten verplaatsen"}
              </button>
              <button
                type="button"
                className="project-overflow-item"
                onClick={() => {
                  startEditPhase(menuPhase);
                  setRowMenuPhaseId(null);
                }}
              >
                <Pencil size={14} /> Datums aanpassen
              </button>
              <button
                type="button"
                className="project-overflow-item danger"
                onClick={() => {
                  setRowMenuPhaseId(null);
                  startTransition(() => deletePhase(projectId, menuPhase.id).catch(() => {}));
                }}
              >
                <Trash2 size={14} /> Fase verwijderen
              </button>
            </div>,
            document.body
          );
        })()}

      {detailPhase &&
        (() => {
          const linked = tasks.filter((t) => t.phase_id === detailPhase.id);
          const done = linked.filter((t) => t.done).length;
          return (
            <div className="sig-overlay" onClick={() => setDetailPhase(null)}>
              <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                <div className="modal-title">{detailPhase.title}</div>
                <div className="access-summary-sub">
                  {fmtDate(detailPhase.start_date)} – {fmtDate(detailPhase.end_date)}
                </div>
                {phaseAssigneeLabel(detailPhase) && <div className="access-summary-sub">{phaseAssigneeLabel(detailPhase)}</div>}
                {linked.length > 0 && (
                  <div className="access-summary-sub">
                    {done}/{linked.length} taken afgerond
                  </div>
                )}
                {detailPhase.fixed_date && (
                  <div className="hint-bar small">
                    <Lock size={12} style={{ display: "inline", marginRight: 4, verticalAlign: -1 }} />
                    Deze fase schuift niet automatisch mee met andere wijzigingen.
                  </div>
                )}
                <div className="modal-actions">
                  <button type="button" className="btn-ghost" onClick={() => setDetailPhase(null)}>
                    Sluiten
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {canEdit && editingId && (
        <div className="add-form">
          <div className="add-form-title">
            Fase aanpassen — {phases.find((p) => p.id === editingId)?.title}
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
          <AssigneeInput
            assignee={editForm.assignee}
            assigneeTeamMemberIds={editForm.assigneeTeamMemberIds}
            onChangeAssignee={(v) => setEditForm({ ...editForm, assignee: v })}
            onChangeTeamMemberIds={(ids) => setEditForm({ ...editForm, assigneeTeamMemberIds: ids })}
            teamMembers={teamMembers}
          />
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

      {canEdit && showAdd && (
        <div className="sig-overlay" onClick={closeAdd}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "85vh", overflowY: "auto" }}>
            <div className="modal-title">Planningsonderdeel toevoegen</div>
            <div className="add-form-grid">
              <input
                placeholder="Onderdeel (bv. Ruwbouw, Dakbedekking)"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
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
            </div>
            <AssigneeInput
              assignee={form.assignee}
              assigneeTeamMemberIds={form.assigneeTeamMemberIds}
              onChangeAssignee={(v) => setForm({ ...form, assignee: v })}
              onChangeTeamMemberIds={(ids) => setForm({ ...form, assigneeTeamMemberIds: ids })}
              teamMembers={teamMembers}
            />
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
            <div className="modal-actions">
              <button type="button" className="btn-ghost" onClick={closeAdd}>
                Annuleren
              </button>
              <button type="button" className="btn-primary" onClick={addItem}>
                <Plus size={14} /> Toevoegen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
