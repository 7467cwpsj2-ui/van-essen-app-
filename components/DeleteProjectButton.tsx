"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteProject } from "@/lib/actions/projects";

export function DeleteProjectButton({ projectId, projectName }: { projectId: string; projectName: string }) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [pending, startTransition] = useTransition();

  const canConfirm = confirmText.trim() === projectName.trim();

  const confirm = () => {
    if (!canConfirm) return;
    startTransition(() => {
      deleteProject(projectId).catch((err) => alert(err instanceof Error ? err.message : "Verwijderen mislukt."));
    });
  };

  return (
    <>
      <button type="button" className="icon-btn danger ghost" onClick={() => setOpen(true)} title="Project verwijderen">
        <Trash2 size={16} />
      </button>
      {open && (
        <div className="sig-overlay" onClick={() => !pending && setOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Project verwijderen</div>
            <p className="modal-text">
              Dit verwijdert <b>{projectName}</b> permanent, inclusief alle planning, documenten, meerwerk, chat en notities. Dit kan
              niet ongedaan gemaakt worden.
            </p>
            <p className="modal-text">
              Typ <b>{projectName}</b> om te bevestigen:
            </p>
            <input
              autoFocus
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={projectName}
            />
            <div className="modal-actions">
              <button type="button" className="btn-ghost" onClick={() => setOpen(false)} disabled={pending}>
                Annuleren
              </button>
              <button type="button" className="btn-danger" onClick={confirm} disabled={!canConfirm || pending}>
                {pending ? "Bezig…" : "Definitief verwijderen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
