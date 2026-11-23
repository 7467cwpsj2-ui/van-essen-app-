"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { updateQuickJob } from "@/lib/actions/quickJobs";
import type { QuickJob } from "@/types/database";

// Snelle bewerk-modal rechtstreeks op de klus-detailpagina, zodat de
// eigenaar niet eerst naar Algemene planning hoeft om op het potloodje
// te drukken voor de gewone velden. De dag-voor-dag bezetting blijft
// wel voorbehouden aan Algemene planning (die link blijft staan),
// hier gaat het om titel/adres/omschrijving/datums/bezetting in het
// geheel.
export function QuickJobEditButton({ job, teamMembers }: { job: QuickJob; teamMembers: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: job.title,
    address: job.address ?? "",
    description: job.description ?? "",
    start: job.start_date,
    end: job.end_date,
    assigneeTeamMemberIds: job.assignee_team_member_ids,
  });
  const [pending, startTransition] = useTransition();

  const openModal = () => {
    setForm({
      title: job.title,
      address: job.address ?? "",
      description: job.description ?? "",
      start: job.start_date,
      end: job.end_date,
      assigneeTeamMemberIds: job.assignee_team_member_ids,
    });
    setOpen(true);
  };

  const toggleMember = (id: string) => {
    setForm((f) => ({
      ...f,
      assigneeTeamMemberIds: f.assigneeTeamMemberIds.includes(id)
        ? f.assigneeTeamMemberIds.filter((m) => m !== id)
        : [...f.assigneeTeamMemberIds, id],
    }));
  };

  const save = () => {
    if (!form.title.trim() || !form.start || !form.end) return;
    startTransition(() => {
      updateQuickJob(job.id, {
        title: form.title,
        assignee: job.assignee,
        assigneeTeamMemberIds: form.assigneeTeamMemberIds,
        start: form.start,
        end: form.end,
        address: form.address || null,
        description: form.description || null,
      })
        .then(() => setOpen(false))
        .catch((err) => alert(err instanceof Error ? err.message : "Opslaan mislukt."));
    });
  };

  return (
    <>
      <button type="button" className="icon-btn ghost" onClick={openModal} title="Klus bewerken">
        <Pencil size={14} />
      </button>
      {open && (
        <div className="sig-overlay" onClick={() => !pending && setOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Klus bewerken</div>
            <input
              autoFocus
              className="access-name-input"
              placeholder="Titel"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <input
              className="access-name-input"
              placeholder="Adres"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
            <textarea placeholder="Omschrijving" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <div className="add-form-grid">
              <input type="date" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
              <input type="date" value={form.end} min={form.start} onChange={(e) => setForm({ ...form, end: e.target.value })} />
            </div>
            <div className="field-with-label">
              <span className="field-label">Wie werkt hieraan</span>
              {teamMembers.length === 0 ? (
                <div className="empty-hint small">Nog geen personeel toegevoegd.</div>
              ) : (
                <div className="assignee-staff-list">
                  {teamMembers.map((m) => (
                    <label key={m.id} className="checkbox-label">
                      <input type="checkbox" checked={form.assigneeTeamMemberIds.includes(m.id)} onChange={() => toggleMember(m.id)} />
                      {m.name}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-ghost" onClick={() => setOpen(false)} disabled={pending}>
                Annuleren
              </button>
              <button type="button" className="btn-primary" onClick={save} disabled={pending || !form.title.trim()}>
                {pending ? "Bezig…" : "Opslaan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
