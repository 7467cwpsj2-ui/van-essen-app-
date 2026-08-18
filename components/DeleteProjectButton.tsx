"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { MoreVertical, Trash2 } from "lucide-react";
import { deleteProject } from "@/lib/actions/projects";

export function DeleteProjectButton({ projectId, projectName }: { projectId: string; projectName: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [pending, startTransition] = useTransition();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  const toggleMenu = () => {
    if (!menuOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
    setMenuOpen((v) => !v);
  };

  const canConfirm = confirmText.trim() === projectName.trim();

  const confirm = () => {
    if (!canConfirm) return;
    startTransition(() => {
      deleteProject(projectId).catch((err) => alert(err instanceof Error ? err.message : "Verwijderen mislukt."));
    });
  };

  return (
    <>
      <div className="project-overflow">
        <button ref={triggerRef} type="button" className="icon-btn ghost" onClick={toggleMenu} title="Meer opties">
          <MoreVertical size={16} />
        </button>
      </div>
      {menuOpen &&
        menuPos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            className="project-overflow-menu"
            style={{ position: "fixed", top: menuPos.top, right: menuPos.right }}
          >
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
          </div>,
          document.body
        )}
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
