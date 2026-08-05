"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { createNote, deleteNote, setNoteVisibility } from "@/lib/actions/notes";
import type { Note, NoteVisibility, Role } from "@/types/database";

const VIS_LABEL: Record<NoteVisibility, string> = { prive: "Alleen ik", team: "Team", klant: "Team + klant" };
const VIS_CLASS: Record<NoteVisibility, string> = { prive: "vis-private", team: "vis-public", klant: "vis-klant" };

export function NotesPanel({
  projectId,
  role,
  currentUserId,
  notes,
}: {
  projectId: string;
  role: Role;
  currentUserId: string;
  notes: Note[];
}) {
  const [text, setText] = useState("");
  const [visibility, setVisibility] = useState<NoteVisibility>("prive");
  const [, startTransition] = useTransition();

  const add = () => {
    if (!text.trim()) return;
    const value = text;
    setText("");
    startTransition(() => {
      createNote(projectId, value, visibility).catch((err) => alert(err instanceof Error ? err.message : "Toevoegen mislukt."));
    });
  };

  const visibilityOptions: NoteVisibility[] =
    role === "eigenaar" ? ["prive", "team", "klant"] : role === "team" ? ["prive", "team"] : ["prive"];

  return (
    <div className="panel">
      {role === "klant" && (
        <div className="hint-bar">Jouw notities zijn standaard alleen zichtbaar voor de eigenaar, tot die ze eventueel deelt.</div>
      )}
      {notes.length === 0 && <div className="empty-hint">Nog geen notities.</div>}
      <div className="note-list">
        {notes.map((n) => (
          <div key={n.id} className="note-card">
            <div className="note-top">
              <span className="note-author">{n.author_name || "—"}</span>
              <span className="note-date mono">{new Date(n.created_at).toLocaleDateString("nl-NL")}</span>
              <span className={"vis-pill " + VIS_CLASS[n.visibility]}>{VIS_LABEL[n.visibility]}</span>
              {role === "eigenaar" && (
                <select
                  className="note-visibility-select"
                  value={n.visibility}
                  onChange={(e) => setNoteVisibility(projectId, n.id, e.target.value as NoteVisibility).catch((err) => alert(err.message))}
                >
                  <option value="prive">Alleen ik</option>
                  <option value="team">Team</option>
                  <option value="klant">Team + klant</option>
                </select>
              )}
              {(role === "eigenaar" || n.author_id === currentUserId) && (
                <button
                  className="icon-btn danger ghost note-del"
                  onClick={() => deleteNote(projectId, n.id).catch((err) => alert(err.message))}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
            <div className="note-text">{n.text}</div>
          </div>
        ))}
      </div>
      <div className="add-form">
        <div className="add-form-title">Notitie toevoegen</div>
        <textarea rows={3} placeholder="Typ je notitie…" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="add-form-grid">
          {visibilityOptions.length > 1 && (
            <select value={visibility} onChange={(e) => setVisibility(e.target.value as NoteVisibility)}>
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
      </div>
    </div>
  );
}
