"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { ProjectNumberEditor } from "@/components/ProjectNumberEditor";
import { updateProjectDetails, updateProjectExternalRefs, updateProjectNumber } from "@/lib/actions/projects";

export function EditProjectButton({
  projectId,
  name,
  address,
  projectNumber,
  projectNumberYear,
  offerNumber,
  invoiceNumbers,
}: {
  projectId: string;
  name: string;
  address: string | null;
  projectNumber: number | null;
  projectNumberYear: number | null;
  offerNumber: string | null;
  invoiceNumbers: string[];
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name, address: address || "" });
  const [pending, startTransition] = useTransition();

  const openModal = () => {
    setForm({ name, address: address || "" });
    setOpen(true);
  };

  const save = () => {
    if (!form.name.trim()) return;
    startTransition(() => {
      updateProjectDetails(projectId, { name: form.name, address: form.address || null })
        .then(() => setOpen(false))
        .catch((err) => alert(err instanceof Error ? err.message : "Opslaan mislukt."));
    });
  };

  return (
    <>
      <button type="button" className="icon-btn ghost" onClick={openModal} title="Projectnaam en adres bewerken">
        <Pencil size={14} />
      </button>
      {open && (
        <div className="sig-overlay" onClick={() => !pending && setOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Project bewerken</div>
            <input
              autoFocus
              className="access-name-input"
              placeholder="Projectnaam"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              className="access-name-input"
              placeholder="Adres"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
            <div className="modal-actions">
              <button type="button" className="btn-ghost" onClick={() => setOpen(false)} disabled={pending}>
                Annuleren
              </button>
              <button type="button" className="btn-primary" onClick={save} disabled={pending || !form.name.trim()}>
                {pending ? "Bezig…" : "Opslaan"}
              </button>
            </div>

            <div style={{ borderTop: "1px solid var(--border)", marginTop: 14, paddingTop: 14 }}>
              <ProjectNumberEditor
                year={projectNumberYear}
                sequence={projectNumber}
                offerNumber={offerNumber}
                invoiceNumbers={invoiceNumbers}
                onSaveNumber={(year, seq) => updateProjectNumber(projectId, year, seq)}
                onSaveRefs={(data) => updateProjectExternalRefs(projectId, data)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
