"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Plus, Trash2 } from "lucide-react";
import {
  approveCompletionPoint,
  createCompletionPoint,
  deleteCompletionPoint,
  markCompletionPointReady,
  resetCompletionPoint,
} from "@/lib/actions/completionPoints";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";
import type { CompletionPoint, CompletionPointStatus, Role } from "@/types/database";

const STATUS_LABEL: Record<CompletionPointStatus, string> = { open: "Open", gereed: "Gereed gemeld", goedgekeurd: "Goedgekeurd" };
const STATUS_CLASS: Record<CompletionPointStatus, string> = { open: "stamp-open", gereed: "stamp-open", goedgekeurd: "stamp-akkoord" };

export function CompletionPointsPanel({
  projectId,
  role,
  currentTeamMemberId,
  isLocked,
  points,
  teamMembers,
}: {
  projectId: string;
  role: Role;
  currentTeamMemberId: string | null;
  isLocked: boolean;
  points: CompletionPoint[];
  teamMembers: { id: string; name: string }[];
}) {
  const [form, setForm] = useState({ description: "", responsibleTeamMemberId: "", deadline: "" });
  const [, startTransition] = useTransition();

  useRealtimeRefresh("completion_points", projectId);

  const add = () => {
    if (!form.description.trim()) return;
    startTransition(() => {
      createCompletionPoint(projectId, {
        description: form.description,
        responsibleTeamMemberId: form.responsibleTeamMemberId || null,
        deadline: form.deadline || null,
      }).catch((err) => alert(err instanceof Error ? err.message : "Toevoegen mislukt."));
    });
    setForm({ description: "", responsibleTeamMemberId: "", deadline: "" });
  };

  const run = (fn: () => Promise<void>) => startTransition(() => fn().catch((err) => alert(err instanceof Error ? err.message : "Actie mislukt.")));

  return (
    <div className="panel">
      {role === "klant" && <div className="hint-bar">Zodra een punt &ldquo;gereed gemeld&rdquo; is, kun jij het hier goedkeuren.</div>}
      {points.length === 0 && <div className="empty-hint">Nog geen opleverpunten.</div>}
      <div className="work-list">
        {points.map((p) => {
          const canMarkReady =
            !isLocked && p.status === "open" && (role === "eigenaar" || (role === "team" && p.responsible_team_member_id === currentTeamMemberId));
          const canApprove = !isLocked && p.status === "gereed" && (role === "eigenaar" || role === "klant");
          return (
            <div key={p.id} className="list-row">
              <div className="list-row-body">
                <div className="list-row-title">{p.description}</div>
                <div className="list-row-sub">
                  {p.responsible_name && <span>Verantwoordelijke: {p.responsible_name}</span>}
                  {p.deadline && <span className="mono">{p.deadline}</span>}
                </div>
              </div>
              <span className={"stamp " + STATUS_CLASS[p.status]}>{STATUS_LABEL[p.status]}</span>
              {canMarkReady && (
                <button className="btn-primary" onClick={() => run(() => markCompletionPointReady(projectId, p.id))}>
                  <CheckCircle2 size={14} /> Gereed melden
                </button>
              )}
              {canApprove && (
                <button className="btn-primary" onClick={() => run(() => approveCompletionPoint(projectId, p.id))}>
                  Goedkeuren
                </button>
              )}
              {role === "eigenaar" && !isLocked && p.status !== "open" && (
                <button className="btn-ghost" onClick={() => run(() => resetCompletionPoint(projectId, p.id))}>
                  Terugzetten
                </button>
              )}
              {role === "eigenaar" && !isLocked && (
                <button className="icon-btn danger ghost" onClick={() => run(() => deleteCompletionPoint(projectId, p.id))}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          );
        })}
      </div>
      {role === "eigenaar" && !isLocked && (
        <div className="add-form">
          <div className="add-form-title">Opleverpunt toevoegen</div>
          <div className="add-form-grid">
            <input
              placeholder="Omschrijving"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <select value={form.responsibleTeamMemberId} onChange={(e) => setForm({ ...form, responsibleTeamMemberId: e.target.value })}>
              <option value="">Verantwoordelijke kiezen</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
            <button className="btn-primary" onClick={add}>
              <Plus size={14} /> Toevoegen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
