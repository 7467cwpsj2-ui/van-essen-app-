"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { MoreVertical, Trash2 } from "lucide-react";
import { deleteProject } from "@/lib/actions/projects";

export function DeleteProjectButton({ projectId, projectName }: { projectId: string; projectName: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [pending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  const canConfirm = confirmText.trim() === projectName.trim();

  const confirm = () => {
    if (!canConfirm) return;
    startTransition(() => {
      deleteProject(projectId).catch((err) => alert(err instanceof Error ? err.message : "Verwijderen mislukt."));
    });
  };

  return (
    <>
      <div className="project-overflow" ref={menuRef}>
        <button type="button" className="icon-btn ghost" onClick={() => setMenuOpen((v) => !v)} title="Meer opties">
          <MoreVertical size={16} />
        </button>
        {menuOpen && (
          <div className="project-overflow-menu">
            <button
              type="button"
              className="project-overflow-item danger"
              onClick={() => {
                setMenuOpen(false);
                setConfirmText("");
                setOpen(true);
              }}
            >
              <Trash2 size={14} /> Project verwijderen
            </button>
          </div>
        )}
      </div>
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
