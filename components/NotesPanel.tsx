"use client";

import { useState, useTransition } from "react";
import { Check, Pencil, Trash2, Users, UserCheck, X } from "lucide-react";
import { createNote, deleteNote, markNoteReviewed, setNoteVisibility, updateNoteText } from "@/lib/actions/notes";
import type { Note, NoteVisibility, Role } from "@/types/database";

const VIS_LABEL: Record<NoteVisibility, string> = { prive: "Alleen ik", team: "Team", klant: "Team + klant", alleen_klant: "Alleen klant" };
const VIS_CLASS: Record<NoteVisibility, string> = { prive: "vis-private", team: "vis-public", klant: "vis-klant", alleen_klant: "vis-klant" };

export function NotesPanel({
  projectId,
  role,
  currentUserId,
  currentTeamMemberId,
  notes,
  teamMembers,
}: {
  projectId: string;
  role: Role;
  currentUserId: string;
  currentTeamMemberId: string | null;
  notes: Note[];
  teamMembers: { id: string; name: string }[];
}) {
  const [text, setText] = useState("");
  const [visibility, setVisibility] = useState<NoteVisibility>("prive");
  const [visibleTeamMemberIds, setVisibleTeamMemberIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [, startTransition] = useTransition();

  const teamMemberName = (id: string) => teamMembers.find((m) => m.id === id)?.name;

  const toggleFormMember = (id: string) =>
    setVisibleTeamMemberIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const visLabel = (n: Note) => {
    if (n.visibility === "team" && n.visible_team_member_ids.length > 0) {
      return n.visible_team_member_ids.map((id) => teamMemberName(id) || "?").join(", ");
    }
    return VIS_LABEL[n.visibility];
  };

  const add = () => {
    if (!text.trim()) return;
    const value = text;
    setText("");
    startTransition(() => {
      createNote(projectId, value, visibility, visibleTeamMemberIds).catch((err) => alert(err instanceof Error ? err.message : "Toevoegen mislukt."));
    });
    setVisibleTeamMemberIds([]);
  };

  const run = (fn: () => Promise<void>) => startTransition(() => fn().catch((err) => alert(err instanceof Error ? err.message : "Actie mislukt.")));

  const startEdit = (n: Note) => {
    setEditingId(n.id);
    setEditDraft(n.text);
  };

  const saveEdit = (n: Note) => {
    if (!editDraft.trim()) return;
    const value = editDraft;
    setEditingId(null);
    startTransition(() => {
      updateNoteText(projectId, n.id, value).catch((err) => alert(err instanceof Error ? err.message : "Opslaan mislukt."));
    });
  };

  const visibilityOptions: NoteVisibility[] =
    role === "eigenaar" ? ["prive", "team", "klant", "alleen_klant"] : role === "team" ? ["prive", "team"] : ["prive"];

  return (
    <div className="panel">
      {role === "klant" && (
        <div className="hint-bar">Jouw notities zijn standaard alleen zichtbaar voor de eigenaar, tot die ze eventueel deelt.</div>
      )}
      {role === "eigenaar" && notes.some((n) => !n.reviewed) && (
        <div className="hint-bar">Er staan nieuwe notities klaar om te beoordelen — kies hieronder of je ze verder deelt.</div>
      )}
      {notes.length === 0 && <div className="empty-hint">Nog geen notities.</div>}
      <div className="note-list">
        {notes.map((n) => {
          const needsReview = role === "eigenaar" && !n.reviewed;
          return (
            <div key={n.id} className={"note-card" + (needsReview ? " note-card-pending" : "")}>
              <div className="note-top">
                <span className="note-author">{n.author_name || "—"}</span>
                <span className="note-date mono">{new Date(n.created_at).toLocaleDateString("nl-NL")}</span>
                <span className={"vis-pill " + VIS_CLASS[n.visibility]}>{visLabel(n)}</span>
                {needsReview && <span className="vis-pill vis-review">nieuw · nog controleren</span>}
                {role === "eigenaar" && !needsReview && (
                  <select
                    className="note-visibility-select"
                    value={n.visibility}
                    onChange={(e) => run(() => setNoteVisibility(projectId, n.id, e.target.value as NoteVisibility))}
                  >
                    <option value="prive">Alleen ik</option>
                    <option value="team">Team</option>
                    <option value="klant">Team + klant</option>
                    <option value="alleen_klant">Alleen klant</option>
                  </select>
                )}
                {(role === "eigenaar" || n.author_id === currentUserId) && editingId !== n.id && (
                  <button className="icon-btn ghost" onClick={() => startEdit(n)} title="Notitie bewerken">
                    <Pencil size={13} />
                  </button>
                )}
                {(role === "eigenaar" || n.author_id === currentUserId) && (
                  <button className="icon-btn danger ghost note-del" onClick={() => run(() => deleteNote(projectId, n.id))}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
              {editingId === n.id ? (
                <div className="note-edit">
                  <textarea rows={3} value={editDraft} onChange={(e) => setEditDraft(e.target.value)} autoFocus />
                  <div className="note-edit-actions">
                    <button className="btn-ghost" onClick={() => setEditingId(null)}>
                      <X size={13} /> Annuleren
                    </button>
                    <button className="btn-primary" onClick={() => saveEdit(n)} disabled={!editDraft.trim()}>
                      <Check size={13} /> Opslaan
                    </button>
                  </div>
                </div>
              ) : (
                <div className="note-text">{n.text}</div>
              )}
              {needsReview && (
                <div className="review-controls">
                  {n.visibility === "prive" ? (
                    <>
                      <button className="btn-primary" onClick={() => run(() => setNoteVisibility(projectId, n.id, "team"))}>
                        <Users size={13} /> Delen met team
                      </button>
                      <button className="btn-ghost" onClick={() => run(() => markNoteReviewed(projectId, n.id))}>
                        Privé houden
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="btn-primary" onClick={() => run(() => setNoteVisibility(projectId, n.id, "klant"))}>
                        <UserCheck size={13} /> Delen met klant
                      </button>
                      <button className="btn-ghost" onClick={() => run(() => markNoteReviewed(projectId, n.id))}>
                        Niet delen met klant
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="add-form">
        <div className="add-form-title">Notitie toevoegen</div>
        <textarea rows={3} placeholder="Typ je notitie…" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="add-form-grid">
          {visibilityOptions.length > 1 && (
            <select
              value={visibility}
              onChange={(e) => {
                setVisibility(e.target.value as NoteVisibility);
                setVisibleTeamMemberIds([]);
              }}
            >
              {visibilityOptions.map((v) => (
                <option key={v} value={v}>
                  {VIS_LABEL[v]}
                </option>
              ))}
            </select>
          )}
          <button className="btn-primary" onClick={add}>
            Toevoegen
          </button>
        </div>
        {visibility === "team" && teamMembers.length > 0 && (
          <div className="task-team-picker">
            <div className="task-team-picker-hint">Niemand aangevinkt = het hele team kan deze notitie zien.</div>
            <div className="task-team-picker-grid">
              {role === "team" && currentTeamMemberId && (
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={visibleTeamMemberIds.includes(currentTeamMemberId)}
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
                      checked={visibleTeamMemberIds.includes(m.id)}
                      onChange={() => toggleFormMember(m.id)}
                    />
                    {m.name}
                  </label>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
